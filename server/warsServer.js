var Server = require("../lib/gamenode/server/gameNodeServer").GameNodeServer,
    SessionStorage = require("../lib/gamenode/server/sessionStorage").SessionStorage,
    SubscriptionManager = require("../lib/gamenode/server/subscriptionManager").SubscriptionManager,
    Skeleton = require("./skeleton").Skeleton,
    Messenger = require("./messenger").Messenger,
    configuration = require("./configuration").configuration,
    settings = require("./settings").settings,
    database = require("./database"),
    utils = require("./utils"),
    Timer = require("./timer").Timer,
    GameManagement = require("./game").GameManagement,
    GameProcedures = require("./game").GameProcedures,
    GameActions = require("./game").GameActions;

function WarsServer() {
  this.sessionStorage = new SessionStorage();
  this.database = database.create(configuration.database.type, configuration.database);
  this.configuration = configuration;
  this.settings = settings;
  this.subscriptions = new SubscriptionManager();
  this.gameManagement = new GameManagement(this.database);
  this.gameActions = new GameActions(this.database);
  this.gameProcedures = new GameProcedures(this.database);
  this.messenger = new Messenger(this.subscriptions);
  this.gameMutexes = [];
  this.timer = new Timer(1000);
  this.timer.start();
}

exports.WarsServer = WarsServer;
WarsServer.prototype = new Server(Skeleton);

WarsServer.prototype.gameMutex = function(gameId) {
  var mutex = null;
  for(var i = 0; i < this.gameMutexes.length; ++i) {
    if(this.gameMutexes[i].gameId == gameId) {
      mutex = this.gameMutexes[i].mutex;
      break;
    }
  }
  
  if(mutex === null) {
    mutex = new utils.Mutex();
    this.gameMutexes.push({gameId: gameId, mutex: mutex});
  }
  
  return mutex;
}
