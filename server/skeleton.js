var entities = require("./entities");
var utils = require("./utils");

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
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var game = new entities.Game(null, this.session.userId, name, mapId, "pregame", 0, 0, 0, 0, 
                               {public: public, turnLength: turnLength});
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.gameManagement.createGame(game, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, gameId: result.gameId});
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
  this.server.gameManagement.joinGame(userId, gameId, playerNumber, function(result) {
    if(result.success) {
      this_.server.database.user(userId, function(result) {
        this_.server.subscriptions.forSubscribers(function(sub) {
          var isMe = result.user.userId == sub.session.userId;
          sub.client.stub.playerJoined(playerNumber, result.user.username, isMe);
        }, "game-" + gameId);
      });
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.leaveGame = function(gameId, playerNumber) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameManagement.leaveGame(userId, gameId, playerNumber, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.playerLeft(playerNumber);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.startGame = function(gameId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameManagement.startGame(userId, gameId, function(result) {
    if(result.success) {
      this_.server.gameActions.nextTurn(gameId, userId, function(result) {
        if(result.success) {
          this_.server.subscriptions.forSubscribers(function(sub) {
            sub.client.stub.gameStarted(gameId);
          }, "game-" + gameId);
          this_.client.sendResponse(requestId, {success: true});
        } else {
          this_.client.sendResponse(requestId, {success: false, reason: result.reason});
        }
      });
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.deleteGame = function(gameId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameManagement.deleteGame(userId, gameId, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.openGames = function() {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.gameManagement.openGames(function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, games: result.games});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.publicGames = function() {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.gameManagement.publicGames(function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, games: result.games});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.myGames = function() {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.gameManagement.myGames(this.session.userId, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, games: result.games});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// MAP MANAGEMENT

Skeleton.prototype.createMap = function(name, initialFunds, mapData) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var map = new entities.Map(null, this.session.userId, name, initialFunds, mapData);
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.createMap(map, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, mapId: result.mapId});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.updateMap = function(mapId, name, initialFunds, mapData) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var map = new entities.Map(mapId, this.session.userId, name, initialFunds, mapData);
  this.server.database.updateMap(map, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.mapData = function(mapId) {
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
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.maps(function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, maps: result.maps});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.myMaps = function() {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.myMaps(this.session.userId, function(result) {
    if(result.success) {
      this_.client.sendResponse(requestId, {success: true, maps: result.maps});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// PROFILE MANAGEMENT

Skeleton.prototype.saveProfile = function(username, password, email, theme, defaultEmailSetting) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.user(this.session.userId, function(result) {
    if(result.success) {
      result.user.username = username;
      if(password !== null) 
        result.user.password = password;
      result.user.email = email;
      result.user.settings.emailNotifications = defaultEmailSetting;
      result.user.settings.gameTheme = theme;
      this_.server.database.updateUser(result.user, function(success) {
        if(result.success) {
          this_.client.sendResponse(requestId, {success: true, profile: result.user});
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
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.user(this.session.userId, function(result) {
    if(result.success) {
      result.user.password = undefined;
      this_.client.sendResponse(requestId, {success: true, profile: result.user});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// USER MANAGEMENT

Skeleton.prototype.newSession = function(credentials) {
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.userId(credentials.username, credentials.password, function(result) {
    if(result.success) {
      this_.session = {userId: result.userId};
      this_.sessionId = this_.server.sessionStorage.createSession(this_.session);
      this_.client.sendResponse(requestId, {success: true, sessionId: this_.sessionId});
    } else {
      this_.client.sendResponse(requestId, {success: false, sessionId: null, reason: result.reason});
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
  var user = new entities.User(null, username, password, email, 
                               {emailNotifications: true, gameTheme: "pixel"});
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.register(user, function(userId) {
    if(userId !== null) {
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

// GAME

Skeleton.prototype.gameRules = function(gameId) {
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
  
  return rules;
}

Skeleton.prototype.gameData = function(gameId) {
  var timer = new utils.Timer("gameData");
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
      }
      this_.client.sendResponse(requestId, {success: true, game: game, author: author});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.myFunds = function(gameId) {
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

Skeleton.prototype.turnRemaining = function(gameId) {
  
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
  var timer = new utils.Timer("moveAndAttack");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.moveAndAttack(gameId, userId, unitId, destination, targetId, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.moveAndWait = function(gameId, unitId, destination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.moveAndWait(gameId, userId, unitId, destination, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.moveAndCapture = function(gameId, unitId, destination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.moveAndCapture(gameId, userId, unitId, destination, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.moveAndDeploy = function(gameId, unitId, destination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.moveAndDeploy(gameId, userId, unitId, destination, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.undeploy = function(gameId, unitId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.undeploy(gameId, userId, unitId, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.moveAndLoadInto = function(gameId, unitId, carrierId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.moveAndLoadInto(gameId, userId, unitId, carrierId, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.moveAndUnload = function(gameId, unitId, destination, carriedUnitId, unloadDestination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.moveAndUnload(gameId, userId, unitId, destination, 
                                        carriedUnitId, unloadDestination, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.build = function(gameId, unitTypeId, destination) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.build(gameId, userId, unitTypeId, destination, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.endTurn = function(gameId) {
  var timer = new utils.Timer("endTurn");
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var requestId = this.client.requestId;
  var this_ = this;
  var userId = this.session.userId;
  this.server.gameActions.nextTurn(gameId, userId, function(result) {
    if(result.success) {
      this_.server.subscriptions.forSubscribers(function(sub) {
        sub.client.stub.gameUpdate(gameId, result.changedTiles);
        if(result.finished) {
          sub.client.stub.gameFinished(gameId);
        } else {
          sub.client.stub.gameTurnChange(gameId, result.inTurnNumber);
        }
      }, "game-" + gameId);
      this_.client.sendResponse(requestId, {success: true});
      timer.end();
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: result.reason});
    }
  });
}

Skeleton.prototype.surrender = function(gameId) {
  
}

// CHAT

Skeleton.prototype.chatMessages = function(gameId) {
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
    this_.server.subscriptions.forSubscribers(function(sub) {
      sub.client.stub.chatMessage(time, sender, message);
    }, "lobbyChat");
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
        this_.server.subscriptions.forSubscribers(function(sub) {
          sub.client.stub.chatMessage(time.toUTCString(), sender, message);
        }, "game-" + gameId);
      });
    }
  });
}

// GAME EVENT TICKER

Skeleton.prototype.tickerMessages = function(gameId, count) {
  
}

// GAME STATISTICS

Skeleton.prototype.gameStatistics = function(gameId) {
  
}

Skeleton.prototype.lastTurnStatistics = function(gameId) {
  
}