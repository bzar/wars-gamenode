var entities = require("./entities");
var utils = require("./utils");
var crypto = require("crypto");

function Skeleton(client) {
  this.client = client;
  this.server = this.client.server;
  this.session = null;
  this.sessionId = null;

  client.onDisconnect = function() {
    this.server.subscriptions.removeAllSubscriptions(this);
  }
}

exports.Skeleton = Skeleton;

// GAME MANAGEMENT

Skeleton.prototype.createGame = function(name, mapId, public, turnLength) {
  var timer = new utils.Timer("Skeleton.createGame");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var game = new entities.Game(null, this.session.userId, name, mapId, "pregame", 0, 0, 0, 0, 
                               {public: public, turnLength: turnLength});
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.gameManagement.createGame(game, function(result) {
    if(result.success) {
      utils.log("game", "New game: " + name + " (" + result.gameId + ")");
      this_.client.sendResponse(requestId, {success: true, gameId: result.gameId});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.joinGame = function(gameId, playerNumber) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;

  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.joinGame");
    this_.server.gameManagement.joinGame(userId, gameId, playerNumber, function(result) {
      if(result.success) {
        this_.server.database.user(userId, function(result) {
          this_.server.messenger.sendPlayerJoined(gameId, playerNumber, result.user.username, result.user.userId);
        });
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.leaveGame = function(gameId, playerNumber) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;

  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.leaveGame");
    this_.server.gameManagement.leaveGame(userId, gameId, playerNumber, function(result) {
      if(result.success) {
        this_.server.messenger.sendPlayerLeft(gameId, playerNumber);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.startGame = function(gameId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;

  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.startGame");
    this_.server.gameManagement.startGame(userId, gameId, function(result) {
      if(result.success) {
        this_.server.gameActions.nextTurn(gameId, userId, function(result) {
          if(result.success) {
            if(result.untilNextTurn !== null) {
              var server = this_.server;
              this_.server.timer.removeGroup(gameId);
              this_.server.timer.addTimer(function() {
                this_.server.gameProcedures.automaticEndTurn(gameId, server);
              }, result.untilNextTurn*1000, gameId);
            }
            this_.server.messenger.sendGameStarted(gameId);
            this_.client.sendResponse(requestId, {success: true});
            timer.end();
          } else {
            this_.client.sendResponse(requestId, {success: false, reason: result.reason});
          }
        });
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.deleteGame = function(gameId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
  
  var this_ = this;
  var requestId = this.client.requestId;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.deleteGame");
    this_.server.gameManagement.deleteGame(userId, gameId, function(result) {
      if(result.success) {
        utils.log("game", "Game " + gameId + " deleted");
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.openGames = function() {
  var timer = new utils.Timer("Skeleton.openGames");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.gameManagement.openGames(function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, games: result.games});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.publicGames = function() {
  var timer = new utils.Timer("Skeleton.publicGames");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.gameManagement.publicGames(function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, games: result.games});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.myGames = function() {
  var timer = new utils.Timer("Skeleton.myGames");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.gameManagement.myGames(this.session.userId, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, games: result.games});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// MAP MANAGEMENT

Skeleton.prototype.createMap = function(name, initialFunds, mapData) {
  var timer = new utils.Timer("Skeleton.createMap");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var map = new entities.Map(null, this.session.userId, name, initialFunds, mapData);
  if(map.players < 2) return {success: false, reason: "Map must have at least two players!"};
  
  this.server.database.createMap(map, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, mapId: result.mapId});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.updateMap = function(mapId, name, initialFunds, mapData) {
  var timer = new utils.Timer("Skeleton.updateMap");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var map = new entities.Map(mapId, this.session.userId, name, initialFunds, mapData);
  if(map.players < 2) return {success: false, reason: "Map must have at least two players!"};
  
  this.server.database.updateMap(map, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.mapData = function(mapId) {
  var timer = new utils.Timer("Skeleton.mapData");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  
  this.server.database.map(mapId, function(result) {
    if(!result.success) {
      this_.client.sendResponse(requestId, {success: false});
    } else {
      var map = result.map;
      this_.server.database.mapData(mapId, function(result) {
        if(result.success) {
          this_.client.sendResponse(requestId, {success: true, name: map.name, funds: map.funds, 
                                                players: map.players, mapData: result.mapData});
        } else {
          this_.client.sendResponse(requestId, {success: false, reason: result.reason});
        }
      });
    }
  });
}

Skeleton.prototype.maps = function() {
  var timer = new utils.Timer("Skeleton.maps");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.maps(function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, maps: result.maps});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.myMaps = function() {
  var timer = new utils.Timer("Skeleton.myMaps");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.myMaps(this.session.userId, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, maps: result.maps});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// PROFILE MANAGEMENT

Skeleton.prototype.saveProfile = function(username, password, email, theme, defaultEmailSetting) {
  var timer = new utils.Timer("Skeleton.saveProfile");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.user(this.session.userId, function(result) {
    if(result.success) {
      result.user.username = username;
      if(password !== null) {
        var hash = crypto.createHash("sha256");
        hash.update(password);
        hash.update(this_.server.configuration.salt);
        var digest = hash.digest("hex");
        result.user.password = digest;
      }
      result.user.email = email;
      result.user.settings.emailNotifications = defaultEmailSetting;
      result.user.settings.gameTheme = theme;
      this_.server.database.updateUser(result.user, function(success) {
        if(result.success) {
          this_.client.sendResponse(requestId, {success: true, profile: result.user});
          timer.end();
        } else {
          this_.client.sendResponse(requestId, {success: false, reason: result.reason});
        }
      });
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.profile = function() {
  var timer = new utils.Timer("Skeleton.profile");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.user(this.session.userId, function(result) {
    if(result.success) {
      result.user.password = undefined;
      this_.client.sendResponse(requestId, {success: true, profile: result.user});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// USER MANAGEMENT

Skeleton.prototype.newSession = function(credentials) {
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.userByName(credentials.username, function(result) {
    if(!result.success) {
      utils.log("login", "Unknown user " + credentials.username);
      this_.client.sendResponse(requestId, {success: false, sessionId: null, reason: result.reason});
      return;
    }
    
    var hash = crypto.createHash("sha256");
    hash.update(credentials.password);
    hash.update(this_.server.configuration.salt);
    var digest = hash.digest("hex");
    
    if(digest == result.user.password) {
      this_.session = {userId: result.user.userId};
      this_.sessionId = this_.server.sessionStorage.createSession(this_.session);
      utils.log("login", credentials.username + " logged in");
      this_.client.sendResponse(requestId, {success: true, sessionId: this_.sessionId});
    } else {
      utils.log("login", "Invalid login attempt for user " + credentials.username);
      this_.client.sendResponse(requestId, {success: false, sessionId: null, reason: "Invalid credentials"});
    }
  });
}

Skeleton.prototype.resumeSession = function(sessionId) {
  this.session = this.server.sessionStorage.getSession(sessionId);
  this.sessionId = sessionId;
  if(this.session !== undefined) {
    return {success: true, sessionId: sessionId};
  } else {
    return {success: false, sessionId: null};
  }
}

Skeleton.prototype.closeSession = function() {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var success = this.server.sessionStorage.deleteSession(this.sessionId);
  return {success: success};
}

Skeleton.prototype.register = function(username, password, email) {
  var timer = new utils.Timer("Skeleton.register");
  if(username.length < this.server.settings.minimumUsernameLength)  {
    return {success: false, reason: "Username must be at least " + this.server.settings.minimumUsernameLength + " characters long!"};
  }
  var hash = crypto.createHash("sha256");
  hash.update(password);
  hash.update(this.server.configuration.salt);
  var digest = hash.digest("hex");
  var user = new entities.User(null, username, digest, email, 
                               {emailNotifications: true, gameTheme: "pixel"});
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.register(user, function(userId) {
    if(userId !== null) {
      this_.client.sendResponse(requestId, {success: true});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// GAME

Skeleton.prototype.gameRules = function(gameId) {
  var timer = new utils.Timer("Skeleton.gameRules");
  var elements = this.server.settings.gameElements;
  var rules = {
    armors: elements.armors,
    units: elements.units,
    terrains: elements.terrains,
    weapons: elements.weapons,
    terrainFlags: elements.terrainFlags,
    unitClasses: elements.unitClasses,
    movementTypes: elements.movementTypes,
    unitFlags: elements.unitFlags
  }
  
  if(gameId !== null) {
    rules.bannedUnits = [];
  }
  
  timer.end();
  return rules;
}

Skeleton.prototype.gameData = function(gameId) {
  var timer = new utils.Timer("Skeleton.gameData");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.gameInformation.gameData(gameId, function(result) {
    if(result.success) {
      var author = result.game.authorId == userId;
      var game = result.game;
      for(var i = 0; i < game.players.length; ++i) {
        game.players[i].isMe = game.players[i].userId == userId;
        if(!game.players[i].isMe) {
          game.players[i].funds = null;
          game.players[i].settings = null;
        }
      }
      this_.client.sendResponse(requestId, {success: true, game: game, author: author, turnRemaining: game.turnRemaining()});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.emailNotifications = function(gameId) {
  var timer = new utils.Timer("Skeleton.emailNotifications");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.database.players(gameId, function(result) {
    if(result.success) {
      var value = null;
      for(var i = 0; i < result.players.length; ++i) {
        if(result.players[i].userId == userId) {
          value = result.players[i].settings.emailNotifications;
          break;
        }
      }
      if(value === null) {
        this_.client.sendResponse(requestId, {success: false, reason: "Not a player!"});
      } else {
        this_.client.sendResponse(requestId, {success: true, value: value});
        timer.end();
      }
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.setEmailNotifications = function(gameId, value) {
  var timer = new utils.Timer("Skeleton.setEmailNotifications");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.database.players(gameId, function(result) {
    if(result.success) {
      var players = result.players;
      var success = false;
      for(var i = 0; i < players.length; ++i) {
        if(players[i].userId == userId) {
          players[i].settings.emailNotifications = value;
          success = true;
        }
      }
      if(success) {
        this_.server.database.updatePlayers(players, function(success) {
          if(result.success) {
            this_.client.sendResponse(requestId, {success: true});
            timer.end();
          } else {
            this_.client.sendResponse(requestId, {success: false, reason: result.reason});
          }
        });
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: "Not a player!"});
        timer.end();
      }
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.myFunds = function(gameId) {
  var timer = new utils.Timer("Skeleton.myFunds");
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.database.game(gameId, function(result) {
    if(!result.success) {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    } else {
      var game = result.game;
    
      this_.server.database.players(gameId, function(result) {
        if(result.success) {
          var players = result.players;
          var funds = null;
          var passedInTurn = false;
          for(var i = 0; i < players.length; ++i) {
            var player = players[i];
            if(player.playerNumber == game.inTurnNumber) {
              passedInTurn = true;
            }
            if(player.userId == userId) {
              if(passedInTurn) {
                funds = player.funds;
                break;
              } else if(funds === null) {
                funds = player.funds;
              } 
            }
          }
          
          if(funds !== null) {
            this_.client.sendResponse(requestId, {success: true, funds: funds});
            timer.end();
          } else {
            this_.client.sendResponse(requestId, {success: false, reason: "No player for user!"});
          }
        } else {
          this_.client.sendResponse(requestId, {success: false, reason: result.reason});
        }
      
      });
    }
  });
}

Skeleton.prototype.subscribeGame = function(gameId) {
  this.server.subscriptions.addSubscription(this, "game-" + gameId);
  return {success: true};
}

Skeleton.prototype.unsubscribeGame = function(gameId) {
  this.server.subscriptions.removeSubscription(this, "game-" + gameId);
  return {success: true};
}


Skeleton.prototype.moveAndAttack = function(gameId, unitId, destination, targetId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;

  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.moveAndAttack");
    this_.server.gameActions.moveAndAttack(gameId, userId, unitId, destination, targetId, function(result) {
      if(result.success) {
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.moveAndWait = function(gameId, unitId, destination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.moveAndWait");
    this_.server.gameActions.moveAndWait(gameId, userId, unitId, destination, function(result) {
      if(result.success) {
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.moveAndCapture = function(gameId, unitId, destination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.moveAndCapture");
    this_.server.gameActions.moveAndCapture(gameId, userId, unitId, destination, function(result) {
      if(result.success) {
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.moveAndDeploy = function(gameId, unitId, destination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.moveAndDeploy");
    this_.server.gameActions.moveAndDeploy(gameId, userId, unitId, destination, function(result) {
      if(result.success) {
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.undeploy = function(gameId, unitId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.undeploy");
    this_.server.gameActions.undeploy(gameId, userId, unitId, function(result) {
      if(result.success) {
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.moveAndLoadInto = function(gameId, unitId, carrierId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.moveAndLoadInto");
    this_.server.gameActions.moveAndLoadInto(gameId, userId, unitId, carrierId, function(result) {
      if(result.success) {
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.moveAndUnload = function(gameId, unitId, destination, carriedUnitId, unloadDestination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.moveAndUnload");
    this_.server.gameActions.moveAndUnload(gameId, userId, unitId, destination, 
                                          carriedUnitId, unloadDestination, function(result) {
      if(result.success) {
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.build = function(gameId, unitTypeId, destination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.build");
    this_.server.gameActions.build(gameId, userId, unitTypeId, destination, function(result) {
      if(result.success) {
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.endTurn = function(gameId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.endTurn");
    this_.server.gameActions.nextTurn(gameId, userId, function(result) {
      if(result.success) {
        if(result.untilNextTurn !== null) {
          var server = this_.server;
          this_.server.timer.removeGroup(gameId);
          this_.server.timer.addTimer(function() {
            this_.server.gameProcedures.automaticEndTurn(gameId, server);
          }, result.untilNextTurn*1000, gameId);
        }
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        if(result.finished) {
          this_.server.messenger.sendGameFinished(gameId);
        } else {
          this_.server.messenger.sendGameTurnChange(gameId, result.inTurnNumber, result.roundNumber, result.untilNextTurn);
        }
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

Skeleton.prototype.surrender = function(gameId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  
  var mutex = this.server.gameMutex(gameId);
  mutex.lock(function() {
    var timer = new utils.Timer("Skeleton.surrender");
    this_.server.gameActions.surrender(gameId, userId, function(result) {
      if(result.success) {
        if(result.untilNextTurn !== null) {
          var server = this_.server;
          this_.server.timer.removeGroup(gameId);
          this_.server.timer.addTimer(function() {
            this_.server.gameProcedures.automaticEndTurn(gameId, server);
          }, result.untilNextTurn*1000, gameId);
        }
        this_.server.messenger.sendGameUpdate(gameId, result.changedTiles);
        this_.server.messenger.sendGameEvents(gameId, result.events);
        if(result.finished) {
          this_.server.messenger.sendGameFinished(gameId);
        } else {
          this_.server.messenger.sendGameTurnChange(gameId, result.inTurnNumber, result.roundNumber);
        }
        this_.client.sendResponse(requestId, {success: true});
        timer.end();
      } else {
        this_.client.sendResponse(requestId, {success: false, reason: result.reason});
      }
      mutex.release();
    });
  });
}

// CHAT

Skeleton.prototype.chatMessages = function(gameId) {
  var timer = new utils.Timer("Skeleton.chatMessages");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.chatMessages(gameId, function(result) {
    if(result.success) {
      for(var i = 0; i < result.chatMessages.length; ++i) {
        var time = new Date();
        time.setTime(result.chatMessages[i].time);
        result.chatMessages[i].time = time.toUTCString();
      }
      this_.client.sendResponse(requestId, {success: true, chatMessages: result.chatMessages});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.subscribeLobbyChat = function() {
  this.server.subscriptions.addSubscription(this, "lobbyChat");
}

Skeleton.prototype.lobbyChat = function(message) {
  var this_ = this;
  var time = (new Date()).toUTCString();
  this.server.database.user(this.session.userId, function(result) {
    var sender = result.user.username;
    this_.server.messenger.sendChatMessage("lobbyChat", time, sender, message)
  });
}

Skeleton.prototype.chat = function(gameId, message) {
  var this_ = this;
  var time = new Date();
  var chatMessage = new entities.ChatMessage(undefined, gameId, this.session.userId, time.getTime(), message);
  this.server.database.createChatMessage(chatMessage, function(result) {
    if(!result.success) {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    } else {
      this_.server.database.user(this_.session.userId, function(result) {
        var sender = result.user.username;
        this_.server.messenger.sendChatMessage("game-" + gameId, time.toUTCString(), sender, message);
      });
    }
  });
}

// GAME EVENTS

Skeleton.prototype.gameEvents = function(gameId, first, count) {
  var timer = new utils.Timer("Skeleton.gameEvents");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  first = first === undefined ? 0 : first;
  var requestId = this.client.requestId;
  var this_ = this;
  
  this.server.database.gameEvents(gameId, first, count, function(result) {
    if(result.success) {
      var events = result.gameEvents;
      var preparedEvents = [];
      for(var i = 0; i < events.length; ++i) {
        var time = new Date();
        time.setTime(events[i].time);
        preparedEvents.push({
          time: time.toUTCString(),
          content: events[i].content
        });
      }
      this_.client.sendResponse(requestId, {success: true, gameEvents: preparedEvents});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// GAME STATISTICS

Skeleton.prototype.gameStatistics = function(gameId) {
  var timer = new utils.Timer("Skeleton.gameStatistics");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.gameStatistics(gameId, function(result) {
    if(result.success) {
      for(var i = 0; i < result.gameStatistics.length; ++i) {
        result.gameStatistics[i].gameId = undefined;
        result.gameStatistics[i].gameStatisticId = undefined;
      }
      this_.client.sendResponse(requestId, {success: true, gameStatistics: result.gameStatistics});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.gameLatestStatistic = function(gameId) {
  var timer = new utils.Timer("Skeleton.latestStatistic");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.gameLatestStatistic(gameId, function(result) {
    if(result.success) {
      if(result.latestStatistic !== null) {
        result.latestStatistic.gameId = undefined;
        result.latestStatistic.gameStatisticId = undefined;
      }
      this_.client.sendResponse(requestId, {success: true, latestStatistic: result.latestStatistic});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}
