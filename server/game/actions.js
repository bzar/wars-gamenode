var entities = require("../entities");
var settings = require("../settings").settings;

function GameActions(database) {
  this.database = database;
}

exports.GameActions = GameActions;

GameActions.prototype.move = function(gameId, userId, unitId, destination, callback) {
  
}

GameActions.prototype.moveAndAttack = function(gameId, userId, unitId, destination, targetId, callback) {
  
}

GameActions.prototype.moveAndWait = function(gameId, userId, unitId, destination, callback) {
  
}

GameActions.prototype.moveAndCapture = function(gameId, userId, unitId, destination, callback) {
  
}

GameActions.prototype.moveAndDeploy = function(gameId, userId, unitId, destination, callback) {
  
}

GameActions.prototype.undeploy = function(gameId, userId, unitId, callback) {
  
}

GameActions.prototype.load = function(gameId, userId, unitId, carrierId, callback) {
  
}

GameActions.prototype.unload = function(gameId, userId, carrierId, unitId, destination, callback) {
  
}

GameActions.prototype.build = function(gameId, userId, unitType, destination, callback) {
  
}

GameActions.prototype.endTurn = function(game, callback) {
  var database = this.database;
  database.userPlayerInTurn(game.gameId, userId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else {
      var previousPlayer = result.player;
      
      // Clean up last turn
      database.playerUnits(game.gameId, previousPlayer.playerNumber, function(result) {
        var previousPlayerUnits = result.units;
        for(var i = 0; i < previousPlayerUnits.length; ++i) {
          var unit = previousPlayerUnits[i];
          if(!unit.moved)
            unit.wait();
          unit.reset();
        }
        database.updateUnits(previousPlayerUnits, callback)
      });
    }
  });
}

GameActions.prototype.startTurn = function(game, callback) {
  var database = this.database;
  // Determine next player
  database.players(game.gameId, function(result) {
    var players = result.players.sort(function(a, b) { return a.playerNumber - b.playerNumber });
    
    var currentIndex = 0;
    if(game.inTurnNumber != 0) {
      for(var currentIndex = 0; currentIndex < players.length; ++currentIndex) {
        if(players[currentIndex].playerNumber == game.inTurnNumber) break;
      }
    }

    var nextPlayer = null;
    database.tiles(game.gameId, function(result) {
      var tiles = result.tiles;
      database.units(game.gameId, function(result) {
        var units = result.units;
        for(var i = 0; i < players.length && nextPlayer === null; ++i) {
          var player = players[(currentIndex + i) % players.length];
          
          if(player.userId = null)
            continue;
          
          var stillAlive = false;
          for(var j = 0; j < units.length && !stillAlive; ++j) {
            var unit = units[j];
            if(unit.owner == player.playerNumber)
              stillAlive = true;
          }
          
          for(var j = 0; j < tiles.length && !stillAlive; ++j) {
            var tile = tiles[j];
            var tileType = tile.terrainType();
            if(tile.owner == player.playerNumber && tileType.canBuild() && tile.unitId == null)
              stillAlive = true;
          }
          if(stillAlive && nextPlayer === null) {
            nextPlayer = player;
          }
        }
        
        // Change turn
        if(nextPlayer.playerNumber == game.inTurnNumber) {
          game.state = "finished";
          database.updateGame(game, function(result) {
            callback({success: true, finished: true});
          });
        } else {
          game.changeTurn(nextPlayer.playerNumber);
          
          // Handle turn start events for next player
          database.playerTiles(game.gameId, nextPlayer.playerNumber, function(result) {
            var nextPlayerTiles = result.tiles;
            for(var i = 0; i < nextPlayerTiles.length; ++i) {
              var tile = nextPlayerTiles[i];
              var tileType = tile.terrainType();
              // Produce funds
              if(tileType.producesFunds()) {
                nextPlayer.funds += settings.defaultFundsPerProperty;
              }
              
              if(tile.unitId !== null) {
                for(var j = 0; j < units.length; ++j) {
                  var unit = units[j];
                  if(unit.unitId == tile.unitId) {
                    // Heal units
                    if(unit.owner == nextPlayer.playerNumber && tileType.canRepair(unit.unitClass)) {
                      unit.heal(settings.defaultRepairRate);
                    }
                    // Handle capturing
                    if(!unit.capturing) {
                      tile.beingCaptured = false;
                    }
                    break;
                  }
                }
              } else {
                tile.beingCaptured = false;
              }
            }
            
            // Save tiles and units
            database.updateUnits(units, function(result) {
              database.updateTiles(nextPlayerTiles, function(result) {
                database.updateGame(game, function(result) {
                  callback({success: true, finished: false});
                });
              });
            });
          });
        }
      });
    });
  });
}


GameActions.prototype.nextTurn = function(gameId, userId, callback) {
  var this_ = this;
  // Check request validity
  this.database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else if(result.game.state != "inProgress") {
      callback({success: false, reason: "Game not in progress!"});
    } else if(result.game.inTurnNumber == 0) {
      this_.startTurn(result.game, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason});
        } else {
          callback({success: true, finished: result.finished});
        }
      });      
    } else {
      var game = result.game;
      this_.endTurn(game, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason});
        } else {
          this_.startTurn(game, function(result) {
            if(!result.success) {
              callback({success: false, reason: result.reason});
            } else {
              callback({success: true, finished: result.finished});
            }
          });
        }
      });
    }
  });
}

GameActions.prototype.surrender = function(gameId, userId) {
  
}