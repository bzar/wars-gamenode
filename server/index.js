var Server = require("../lib/gamenode/server/gameNodeServer").GameNodeServer,
    SessionStorage = require("../lib/gamenode/server/sessionStorage").SessionStorage,
    SubscriptionManager = require("../lib/gamenode/server/subscriptionManager").SubscriptionManager,
    FileServer = require("../lib/gamenode/server/fileServer").FileServer,
    Skeleton = require("./skeleton").Skeleton,
    config = require("./configuration").configuration,
    settings = require("./settings").settings,
    database = require("./database");

var GameManagement = require("./game").GameManagement;
var GameActions = require("./game").GameActions;

process.on('uncaughtException', function (err) {
  console.log("*** ERROR! ***");
  console.error(err);
});

function WarsServer() {
  this.sessionStorage = new SessionStorage();
  this.database = database.create(config.database.type, config.database);
  this.config = config;
  this.settings = settings;
  this.subscriptions = new SubscriptionManager();
  this.gameManagement = new GameManagement(this.database);
  this.gameActions = new GameActions(this.database);
}

WarsServer.prototype = new Server(Skeleton);

var server = new WarsServer();

server.listen(8888,"0.0.0.0");

server.io.configure(null, function(){
  server.io.set('log level', 0);

  server.io.set('transports', [
    //    'websocket'
    //, 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
});
var fileServer = undefined;
if(config.enableFileServer) {
  fileServer = new FileServer(
    ["jquery-1.6.2.min.js", "skeleton.js", "base.js", "wars.css",
    "login.html", "login.js", "register.html", "register.js", 
    "home.html", "home.js", "myMaps.html", "myMaps.js",
    "mapEditor.html", "mapEditor.js", "map.js", "image_map.js",
    "createGame.html", "createGame.js", "pregame.html", "pregame.js",
    "join.html", "join.js", "game.html", "game.js", "gamelogic.js",
    "profile.html", "profile.js", "spectate.html", "spectate.js"
    ], 
    { 
      gamenode: "../lib/gamenode/web", 
      img: "img" 
    }, 
    __dirname + "/../client", "login.html");
  fileServer.attachTo(server);
}

