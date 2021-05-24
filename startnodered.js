var http = require("http");
var express = require("express");
var RED = require("node-red");

// Create an Express app
var app = express();

// Add a simple route for static content served from 'public'
app.use("/", express.static("public"));

// Create a server
var server = http.createServer(app);

// Create the settings object - see default settings.js file for other options
var settings = {
  // adminAuth: {
  //   //node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 8));" your-password-here
  //   type: "credentials",
  //   users: [
  //     {
  //       username: "admin",
  //       password:
  //         "$2a$08$uPWNRxfnOyj30Nu0GKfhUeLwsFHA.gxPToifS6cyLRfvSS20VcGzy",
  //       permissions: "*"
  //     }
  //   ]
  // },

  httpNodeCors: {
    origin: "*",
    methods: "GET,PUT,POST,DELETE"
  },
  userDir: "/sandbox/dot-nodered/",
  nodesDir: "./nodes",
  httpAdminRoot: "/",
  httpNodeRoot: "/my",
  flowFile: "/sandbox/dot-nodered/flows_sse.json",
  uiPort: 8080,
  functionGlobalContext: {} // enables global context
};

// Initialise the runtime with a server and settings
RED.init(server, settings);

// Serve the editor UI from /red
app.use(settings.httpAdminRoot, RED.httpAdmin);

// Serve the http nodes UI from /api
app.use(settings.httpNodeRoot, RED.httpNode);

server.listen(8080);

// Start the runtime
RED.start();
