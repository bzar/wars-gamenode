var WarsServer = require("./warsServer").WarsServer,
    FileServer = require("../lib/gamenode/server/fileServer").FileServer,
    configuration = require("./configuration").configuration;

if(!configuration.crashOnError) {
  process.on('uncaughtException', function (err) {
    console.log("");
    console.log("*** ERROR! ***");
    console.error(err);
    console.log("");
  });
}



var server = new WarsServer();

server.listen(configuration.port, configuration.interface);

server.io.configure(null, function(){
  server.io.set('log level', configuration.io.logLevel);
  server.io.set('transports', configuration.io.transports);
});

var fileServer = undefined;
if(configuration.enableFileServer) {
  fileServer = new FileServer(
    ["jquery-1.6.2.min.js", "require.js", "gamenode.js", "skeleton.js", "base.js", "wars.css",
    "login.html", "login.js", "register.html", "register.js", 
    "home.html", "home.js", "myMaps.html", "myMaps.js",
    "mapEditor.html", "mapEditor.js", "Map.js", "image_map.js",
    "createGame.html", "createGame.js", "pregame.html", "pregame.js",
    "join.html", "join.js", "game.html", "game.js", "GameLogic.js",
    "profile.html", "profile.js", "spectate.html", "spectate.js",
    "ticker.js", "Theme.js", "gameStatistics.html", "gameStatistics.js",
    "manual.html", "manual.js", "info.html", "info.js", "settings.js",
    "AnimatedMap.js", "vec2d.js", "pixastic.js", "sylvester.js"
    ], 
    { 
      gamenode: "../../lib/gamenode/web", 
      img: "img",
      lib: "lib"
    }, 
    __dirname + "/../client/www", "login.html");
  fileServer.attachTo(server);
}

