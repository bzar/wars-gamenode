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

GameActions.prototype.nextTurn = function(gameId, userId, callback) {
  var database = this.database;
  // Check request validity
  database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else if(result.game.state != "inProgress") {
      callback({success: false, reason: "Game not in progress!"});
    } else {
      var game = result.game;
      database.userPlayerInTurn(gameId, userId, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason});
        } else {
          var previousPlayer = result.player;
          
          // Clean up last turn
          database.playerUnits(gameId, previousPlayer.playerNumber, function(result) {
            var previousPlayerUnits = result.units;
            for(var i = 0; i < previousPlayerUnits.length; ++i) {
              var unit = previousPlayerUnits[i];
              if(!unit.moved)
                unit.wait();
              unit.reset();
            }
            database.updateUnits(previousPlayerUnits, function(result) {
                
              // Determine next player
              database.players(gameId, function(result) {
                var players = result.players.sort(function(a, b) { a.playerNumber - b.playerNumber });
                
                var currentIndex = 0;
                for(var currentIndex = 0; currentIndex < players.length; ++currentIndex) {
                  if(players[i].playerNumber == game.inTurnNumber) break;
                }

                var nextPlayer = null;
                database.tiles(gameId, function(result) {
                  var tiles = result.tiles;
                  database.units(gameId, function(result) {
                    var units = result.units;
                    for(var i = 0; i < players.length; ++i) {
                      var player = players[(currentIndex + i) % players.length];
                      var stillAlive = false;
                      for(var j = 0; j < units.length && !stillAlive; ++j) {
                        var unit = units[j];
                        if(unit.owner == player.playerNumber)
                          stillAlive = true;
                      }
                      
                      for(var j = 0; j < tiles.length && !stillAlive; ++j) {
                        var tile = tiles[j];
                        var tileType = tile.terrainType();
                        if(unit.owner == player.playerNumber && tileType.canBuild() && tile.unitId == null)
                          stillAlive = true;
                      }
                      
                      if(stillAlive && nextPlayer == null) {
                        nextPlayer = player;
                        break;
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
                      database.playerTiles(gameId, nextPlayer.playerNumber, function(result) {
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
                          database.updateTiles(playerTiles, function(result) {
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
            });
          });
        }
      });
    }
  });
}

GameActions.prototype.surrender = function(gameId, userId) {
  
}