const { util } = require("node-red");

module.exports = function (RED) {
  "use strict";
  var FeedParser = require("feedparser");
  const fetch = require("node-fetch");
  var url = require("url");
  const { pipeline, Transform } = require("stream");

  function FeedParseNode(n) {
    RED.nodes.createNode(this, n);
    this.urls = n.urls || "";
    if (n.interval > 35790) {
      this.warn(RED._("advanced-feed-parser.errors.invalidinterval"));
    }
    this.interval = (parseInt(n.interval) || 15) * 60000;
    var node = this;
    this.interval_id = null;
    this.seen = {};
    this.group = n.group;
    //this.log(`config ${JSON.stringify(n)}`);
    var getFeed = async function (flowMsg, flowSend) {
      node.log("Getfeed fired");
      node.status({ fill: "green", shape: "dot", text: "processing.." });
      var send =
        flowSend ||
        function (m) {
          node.send(m);
        };
      if (flowMsg != null) {
        if (typeof flowMsg.seen !== "undefined") {
          node.seen = flowMsg.seen;
        }
      }
      var feed_urls = node.urls.split(",");
      await feed_urls.reduce(async (memo, feed_url) => {
        await memo;
        node.log("feed url is::" + feed_url);
        var parsedUrl = url.parse(feed_url);
        if (
          !(parsedUrl.host || (parsedUrl.hostname && parsedUrl.port)) &&
          !parsedUrl.isUnix
        ) {
          node.error(
            RED._("advanced-feed-parser.errors.invalidurl" + feed_url)
          );
        } else {
          try {
            var res = await fetch(feed_url, {
              headers: {
                "user-agent": "Mozilla/5.0 (Node-RED)",
                accept: "text/html,application/xhtml+xml"
              },
              timeout: 10000
            });
            if (res.status != 200) {
              node.warn(
                RED._("advanced-feed-parser.errors.badstatuscode") +
                  " " +
                  res.status
              );
            } else {
              var feedparser = new FeedParser();
              var articles = [];
              var makeAsyncIterable = new Transform({
                objectMode: true,
                transform: (data, _, done) => {
                  done(null, data);
                }
              });
              pipeline(res.body, feedparser, makeAsyncIterable);
              for await (const article of makeAsyncIterable) {
                if (
                  !(article.guid in node.seen) ||
                  (node.seen[article.guid] !== 0 &&
                    node.seen[article.guid] != article.date.getTime())
                ) {
                  node.seen[article.guid] = article.date
                    ? article.date.getTime()
                    : 0;
                  if (!node.group) {
                    var msg = RED.util.cloneMessage(flowMsg || {});
                    Object.assign(msg, {
                      sourceFeed: feed_url,
                      topic: article.origlink || article.link,
                      payload: article.description,
                      article: article,
                      seen: RED.util.cloneMessage(node.seen)
                    });
                    send(msg);
                  }
                  articles.push(article);
                }
              }
              if (node.group) {
                var msg = RED.util.cloneMessage(flowMsg || {});
                Object.assign(msg, {
                  sourceFeed: feed_url,
                  article: articles,
                  seen: RED.util.cloneMessage(node.seen)
                });
                if (feed_urls[feed_urls.length - 1] === feed_url) {
                  Object.assign(msg, {
                    complete: true
                  });
                }
                send(msg);
              }
            }
          } catch (err) {
            node.error(err.stack);
          }
        }
      }, undefined);
    };
    if (node.interval > 0) {
      this.interval_id = setInterval(function () {
        getFeed();
      }, node.interval);
    }
    (async () => {
      try {
        await getFeed();
        this.status({ fill: "blue", shape: "ring", text: "done" });
      } catch (error) {
        node.error(error.stack);
      }
    })();
    this.on("input", async function (msg, send, done) {
      node.log(`Got a new input: ${JSON.stringify(msg)}`);
      if (null !== msg && null !== msg.feedUrls) {
        this.urls = msg.feedUrls; // save last urls
      }
      if (typeof msg.feedGroup !== undefined) {
        node.log(`change setting group ${msg.feedGroup}`);
        this.group = msg.feedGroup;
      }
      if (typeof msg.feedInterval !== undefined) {
        this.interval = msg.interval;
      }
      await getFeed(msg, send);
      if (this.interval > 0) {
        if (null !== this.interval_id) {
          clearInterval(this.interval_id);
          this.interval_id = setInterval(function () {
            getFeed(msg);
          }, this.interval);
        }
      }
      done();
      this.status({ fill: "blue", shape: "ring", text: "done" });
    });
  }

  RED.nodes.registerType("advanced-feed-parser", FeedParseNode);
};
