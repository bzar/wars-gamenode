var Server = require("../lib/gamenode/server/gameNodeServer").GameNodeServer,
    SessionStorage = require("../lib/gamenode/server/sessionStorage").SessionStorage,
    FileServer = require("../lib/gamenode/server/fileServer").FileServer,
    Skeleton = require("./skeleton").Skeleton,
    config = require("./configuration").configuration//,
    database = require("./database")


function WarsServer() {
  this.sessionStorage = new SessionStorage();
  this.database = database.create(config.database.type, config.database);
}

WarsServer.prototype = new Server(Skeleton);

var server = new WarsServer();

server.listen(8888,"0.0.0.0");

var fileServer = undefined;
if(config.enableFileServer) {
  fileServer = new FileServer(
    ["jquery-1.6.2.min.js", "skeleton.js", "base.js", "wars.css",
    "login.html", "login.js", "register.html", "register.js", 
    "home.html", "home.js", "myMaps.html", "myMaps.js",
    "mapEditor.html", "mapEditor.js", "map.js", "image_map.js",
    "createGame.html", "createGame.js"
    ], 
    { 
      gamenode: "../lib/gamenode/web", 
      img: "img" 
    }, 
    __dirname + "/../client", "login.html");
  fileServer.attachTo(server);
}

