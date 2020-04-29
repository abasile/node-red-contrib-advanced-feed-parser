
module.exports = function (RED) {
    "use strict";
    var FeedParser = require("feedparser");
    var request = require("request");
    var url = require('url');

    function FeedParseNode(n) {
        RED.nodes.createNode(this, n);
        this.urls = n.urls;
        if (n.interval > 35790) {
            this.warn(RED._("custom-feedparser.errors.invalidinterval"))
        }
        this.interval = (parseInt(n.interval) || 15) * 60000;
        var node = this;
        this.interval_id = null;
        this.seen = {};
        var getFeed = function () {
            var feed_urls = node.urls.split(",");
            feed_urls.forEach(function (feed_url, index) {
                var parsedUrl = url.parse(feed_url);
                if (!(parsedUrl.host || (parsedUrl.hostname && parsedUrl.port)) && !parsedUrl.isUnix) {
                    this.error(RED._("custom-feedparser.errors.invalidurl" + feed_url));
                } else {
                    var req = request(feed_url, {timeout: 10000, pool: false});
                    //req.setMaxListeners(50);
                    req.setHeader('user-agent', 'Mozilla/5.0 (Node-RED)');
                    req.setHeader('accept', 'text/html,application/xhtml+xml');

                    var feedparser = new FeedParser();

                    req.on('error', function (err) {
                        node.error(err);
                    });

                    req.on('response', function (res) {
                        if (res.statusCode != 200) {
                            node.warn(RED._("custom-feedparser.errors.badstatuscode") + " " + res.statusCode);
                        } else {
                            res.pipe(feedparser);
                        }
                    });

                    feedparser.on('error', function (error) {
                        node.error(error);
                    });

                    feedparser.on('readable', function () {
                        var stream = this, article;
                        while (article = stream.read()) {  // jshint ignore:line
                            if (!(article.guid in node.seen) || (node.seen[article.guid] !== 0 && node.seen[article.guid] != article.date.getTime())) {
                                node.seen[article.guid] = article.date ? article.date.getTime() : 0;

                                var msg = {
                                    topic: article.origlink || article.link,
                                    payload: article.description,
                                    article: article
                                };
                                node.send(msg);
                            }
                        }
                    });

                    feedparser.on('meta', function (meta) {
                    });
                    feedparser.on('end', function () {
                    });
                }
            });
        };
        this.interval_id = setInterval(function () {
            getFeed();
        }, node.interval);
        getFeed();
    }

    RED.nodes.registerType("custom-feedparser", FeedParseNode);
};
