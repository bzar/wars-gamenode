var entities = require("../entities");
var settings = require("../settings").settings;
var GameProcedures = require("./procedures").GameProcedures;
var GameInformation = require("./information").GameInformation;

function GameManagement(database) {
  this.database = database;
}

exports.GameManagement = GameManagement;

GameManagement.prototype.createGame = function(game, callback) {
  var this_ = this;
  
  if(game.settings.turnLength !== null && game.settings.turnLength < settings.minimumTurnLength) {
    callback({success: false, reason: "Turn length must be at least " + settings.minimumTurnLength + " seconds!"});
  }
  
  this.database.map(game.mapId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
      return;
    }
    var map = result.map;
    
    this_.database.mapData(game.mapId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason});
        return;
      }
      
      map.mapData = result.mapData;
      var playerIds = [];
      var players = [];
      var gameData = [];
      for(var i = 0; i < map.mapData.length; ++i) {
        var mapTile = map.mapData[i];

        var tile = new entities.Tile(null, null, mapTile.x, mapTile.y, mapTile.type, 
                                    mapTile.subtype, mapTile.owner, null, 
                                    settings.maxCapturePoints, false);
        
        if(mapTile.owner > 0) {
          if(playerIds.indexOf(mapTile.owner) == -1) {
            var player = new entities.Player(null, null, null, mapTile.owner, null, map.funds, 0, 
                                            {emailNotifications: true});
            players.push(player);
            playerIds.push(mapTile.owner);
          }
        }


        tile.unit = null;
        if(mapTile.unit !== null) {
          if(playerIds.indexOf(mapTile.unit.owner) == -1) {
            var player = new entities.Player(null, null, null, mapTile.unit.owner, null, map.funds, 0, 
                                            {emailNotifications: true});
            players.push(player);
            playerIds.push(mapTile.unit.owner);
          }
          tile.unit = new entities.Unit(null, null, mapTile.unit.type, 
                                        mapTile.unit.owner, null, 100, 
                                        false, false, false);
          players[playerIds.indexOf(mapTile.unit.owner)].score += parseInt(tile.unit.health * tile.unit.unitType().price / 100)
        }
        
        gameData.push(tile);
      }
      
      game.inTurnNumber = 0;
      
      this_.database.createGame(game, gameData, players, function(result) {
        if(result.success) {
          callback({success: true, gameId: result.gameId});
        } else {
          callback({success: false, reason: result.reason});
        }
      });
    });
  });
}

GameManagement.prototype.joinGame = function(userId, gameId, playerNumber, callback) {
  var this_ = this;
  this.database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else if(result.game.state != result.game.STATE_PREGAME) {
      callback({success: false, reason: "Can only join during pregame!"});
    } else {
      this_.database.gamePlayer(gameId, playerNumber, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason});
        } else if(result.player.userId !== null) {
          callback({success: false, reason: "Player already reserved!"});
          return;
        } else {
          var player = result.player;
          this_.database.user(userId, function(result) {
            if(!result.success) {
              callback({success: false, reason: result.reason});
            } else {
              player.userId = userId;
              player.playerName = result.user.username;
              player.settings.emailNotifications = result.user.settings.emailNotifications;
              this_.database.updatePlayer(player, function(result) {
                if(result.success) {
                  callback({success: true});
                } else {
                  callback({success: false, reason: result.reason});
                }
              });
            }
          });
        }
      });
    }
  });
}

GameManagement.prototype.leaveGame = function(userId, gameId, playerNumber, callback) {
  var this_ = this;
  this.database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else if(result.game.state != result.game.STATE_PREGAME) {
      callback({success: false, reason: "Can only leave during pregame!"});
    } else {
      var game = result.game;
      this_.database.gamePlayer(gameId, playerNumber, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason});
        } else if(result.player.userId != userId && game.authorId != userId) {
          callback({success: false, reason: "Not the user or game author!"});
          return;
        } else {
          result.player.userId = null;
          result.player.playerName = null;
          this_.database.updatePlayer(result.player, function(result) {
            if(result.success) {
              callback({success: true});
            } else {
              callback({success: false, reason: result.reason});
            }
          });
        }
      });
    }
  });
}

GameManagement.prototype.startGame = function(userId, gameId, callback) {
  var database = this.database;
  var gameInformation = new GameInformation(database);
  var gameProcedures = new GameProcedures(database);
  
  gameInformation.gameData(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else if(result.game.authorId != userId) {
      callback({success: false, reason: "Not the game author!"});
    } else if(result.game.state != game.STATE_PREGAME) {
      callback({success: false, reason: "Can start during pregame!"});
    } else {
      var game = result.game;
      database.players(gameId, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason});
        } else {
          var players = result.players;
          var numPlayers = 0;
          var playersWithoutUsers = [];
          for(var i = 0; i < players.length; ++i) {
            var player = players[i];
            if(player.userId !== null) {
              numPlayers += 1;
            } else {
              playersWithoutUsers.push(player);
            }
          }
          if(numPlayers < 2) {
            callback({success: false, reason: "Need at least two players to start!"});
          } else {
            gameProcedures.surrenderPlayers(game, playersWithoutUsers, function(response) {
              game.state = game.STATE_IN_PROGRESS;
              database.updateGame(game, function(result) {
                if(result.success) {
                  callback({success: true});
                } else {
                  callback({success: false, reason: result.reason});
                }
              });
            });
          }
        }
      });
    }
  });
}

GameManagement.prototype.deleteGame = function(userId, gameId, callback) {
  var this_ = this;
  this.database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else if(result.game.authorId != userId) {
      callback({success: false, reason: "Not the game author!"});
    } else {
      this_.database.deleteGame(gameId, function(result) {
        if(result.success) {
          callback({success: true});
        } else {
          callback({success: false, reason: result.reason});
        }
      });
    }
  });
}

GameManagement.prototype.openGames = function(callback) {
  this.database.openGames(function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else {
      callback({success: true, games: result.games});
    }
  });
}

GameManagement.prototype.publicGames = function(callback) {
  this.database.publicGames(function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else {
      callback({success: true, games: result.games});
    }
  });
}

GameManagement.prototype.myGames = function(userId, callback) {
  this.database.myGames(userId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else {
      callback({success: true, games: result.games});
    }
  });
}
