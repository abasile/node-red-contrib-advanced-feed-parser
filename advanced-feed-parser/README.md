node-red-contrib-advanced-feed-parser
==================================

A modified version of [node-red-node-feedparser-extended](https://github.com/arossmann/node-red-contrib-feedparser-extended) 

However, Functionalty is more closely aligned with base node-red feedparser. This node accepts a comma separated list of feed-urls in Node configuration.

This node also accepts msg.feedUrls as input . An input without feedUrls, will simply force a refresh of feeds and reset of refresh timer.

Impact on performance or limit on how many feeds it can support is not tested.
 
Install
-------

Run the following command in your Node-RED user directory - typically `~/.node-red`

        npm install node-red-contrib-advanced-feed-parser
