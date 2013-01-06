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
    ["jquery-1.6.2.min.js", "require.js", "gamenode.js", "skeleton.js", "base.js", "game.css",
    "common.css", "common.js", "login.html", "login.js", "register.html", "register.js", 
    "mygames.html", "mygames.js", "mymaps.html", "mymaps.js",
    "mapeditor.html", "mapeditor.js", "Map.js", "image_map.js",
    "creategame.html", "creategame.js", "pregame.html", "pregame.js",
    "opengames.html", "opengames.js", "game.html", "game.js", "GameLogic.js",
    "profile.html", "profile.js", "publicgames.html", "publicgames.js",
    "ticker.js", "Theme.js", "gameStatistics.html", "gameStatistics.js",
    "manual.html", "manual.js", "info.html", "info.js", "settings.js",
    "AnimatedMap.js", "vec2d.js", "pixastic.js", "sylvester.js", "Color.js", 
    "maplist.css", "mapeditor.css", "login.css", "creategame.css", "pregame.css", "info.css"
    ], 
    { 
      gamenode: "../../lib/gamenode/web", 
      img: "img",
      lib: "lib"
    }, 
    __dirname + "/../client/www", "login.html");
  fileServer.attachTo(server);
}

