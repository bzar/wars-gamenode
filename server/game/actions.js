var entities = require("../entities");
var settings = require("../settings").settings;
var GameLogic = require("../../client/gamelogic").GameLogic;

function GameActions(database) {
  this.database = database;
}

exports.GameActions = GameActions;

function checkMove(database, gameId, userId, unitId, destination, callback) {
  database.unit(unitId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    var unit = result.unit;
    database.tile(unit.tileId, function(result) {
      var sourceTile = result.tile;
      sourceTile.setUnit(unit);
      
      database.gameData(gameId, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        } 
        
        var game = result.game;
        if(game.state != "inProgress") {
          callback({success: false, reason: "Game not in progress!"}); return;
        } 
        
        var playerInTurn = game.playerInTurn();
        if(playerInTurn.userId != userId) {
          callback({success: false, reason: "User not in turn!"}); return;
        }
        
        var gamelogic = new GameLogic(game, settings.gameElements);
        var canMove = gamelogic.unitCanMoveTo(sourceTile.x, sourceTile.y, destination.x, destination.y);
        if(canMove === null) {
          callback({success: false, reason: "Error determining path!"}); return;
        } else if(canMove === false) {
          callback({success: false, reason: "Unit cannot move there!"}); return;
        }
        
        var destinationTile = game.getTile(destination.x, destination.y);
        
        callback({success: true}, game, playerInTurn, unit, sourceTile, destinationTile, gamelogic);
      });
    });
  });
}

GameActions.prototype.move = function(gameId, userId, unitId, destination, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, 
            function(result, game, player, unit, sourceTile, destinationTile, gamelogic) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
            
    if(destinationTile.unit !== null) {
      callback({success: false, reason: "Destination tile occupied!"}); return;
    }
    
    sourceTile.setUnit(null);
    destinationTile.setUnit(unit);
    
    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile, destinationTile], function(result) {
        callback({success: true, changedTiles: [sourceTile, destinationTile]});
      });
    });
  });
}

GameActions.prototype.moveAndAttack = function(gameId, userId, unitId, destination, targetId, callback) {
  
}

GameActions.prototype.moveAndWait = function(gameId, userId, unitId, destination, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, 
            function(result, game, player, unit, sourceTile, destinationTile, gamelogic) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
            
    if(destinationTile.unit !== null) {
      callback({success: false, reason: "Destination tile occupied!"}); return;
    }
    
    sourceTile.setUnit(null);
    destinationTile.setUnit(unit);
    unit.wait();
    
    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile, destinationTile], function(result) {
        callback({success: true, changedTiles: [sourceTile, destinationTile]});
      });
    });
  });
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

GameActions.prototype.build = function(gameId, userId, unitTypeId, destination, callback) {
  var database = this.database;
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
          var player = result.player;
          database.tileAt(gameId, destination.x, destination.y, function(result) {
            if(!result.success) {
              callback({success: false, reason: result.reason});
            } else {
              var tile = result.tile;
              var tileType = tile.terrainType();
              if(tile.owner != player.playerNumber) {
                callback({success: false, reason: "Tile not owned by player!"});
              } else if(!tileType.canBuild(unitTypeId)) {
                callback({success: false, reason: "Tile cannot build that unit type!"});
              } else if(tile.unitId !== null) {
                callback({success: false, reason: "Tile is occupied!"});
              } else {
                var unitType = settings.gameElements.units[unitTypeId];
                if(unitType === undefined) {
                  callback({success: false, reason: "Unknown unit type!"});
                } else if(player.funds < unitType.price) {
                  callback({success: false, reason: "Not enough funds!"});
                } else {
                  var unit = new entities.Unit(null, tile.tileId, unitType.id, 
                                               player.playerNumber, null, 100, 
                                               false, true, false);
                  player.funds -= unitType.price;
                  database.updatePlayer(player, function(result) {
                    database.createUnit(unit, function(result) {
                      tile.unitId = result.unitId;
                      unit.unitId = result.unitId;
                      tile.unit = unit;
                      database.updateTile(tile, function(result) {
                        callback({success: true, changedTiles: [tile]});
                      });
                    });
                  });
                }
              }
            }
          });
        }
      });
    }
  });
}

GameActions.prototype.endTurn = function(game, userId, callback) {
  var database = this.database;
  database.userPlayerInTurn(game.gameId, userId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else {
      var previousPlayer = result.player;
      
      // Clean up last turn
      database.tiles(game.gameId, function(result) {
        var tiles = result.tiles;
        database.playerUnits(game.gameId, previousPlayer.playerNumber, function(result) {
          var previousPlayerUnits = result.units;
          var changedTiles = [];
          for(var i = 0; i < previousPlayerUnits.length; ++i) {
            var unit = previousPlayerUnits[i];
            for(var j = 0; j < tiles.length; ++j) {
              var tile = tiles[j];
              if(tile.tileId == unit.tileId) {
                tile.unit = unit;
                changedTiles.push(tile);
              }
            }
            if(!unit.moved)
              unit.wait();
            unit.reset();
          }
          database.updateUnits(previousPlayerUnits, function(result) {
            if(!result.success) {
              callback({success: false, reason: result.reason});
            } else {
              callback({success: true, changedTiles: changedTiles});
            }
          });
        });
      });
    }
  });
}

GameActions.prototype.startTurn = function(game, callback) {
  var database = this.database;
  // Determine next player
  database.players(game.gameId, function(result) {
    var players = result.players.sort(function(a, b) { return a.playerNumber - b.playerNumber });
    
    var currentIndex = -1;
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
        for(var i = 1; i <= players.length && nextPlayer === null; ++i) {
          var player = players[(currentIndex + i) % players.length];
          
          if(player.userId == null)
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
            if(tile.owner == player.playerNumber && tileType.builds() && tile.unitId == null)
              stillAlive = true;
          }
          if(stillAlive && nextPlayer === null) {
            nextPlayer = player;
          }
        }
        
        console.log("next: " + nextPlayer.playerNumber + " previous: " + game.inTurnNumber);
        
        // Change turn
        if(nextPlayer.playerNumber == game.inTurnNumber) {
          game.state = "finished";
          database.updateGame(game, function(result) {
            callback({success: true, finished: true, changedTiles: []});
          });
        } else {
          game.changeTurn(nextPlayer.playerNumber);
          
          // Handle turn start events for next player
          var nextPlayerTiles = [];
          for(var i = 0; i < tiles.length; ++i) {
            var tile = tiles[i];
            if(tile.owner != nextPlayer.playerNumber) {
              continue;
            } else {
              nextPlayerTiles.push(tile);
            }
            
            var tileType = tile.terrainType();
            // Produce funds
            if(tileType.producesFunds()) {
              nextPlayer.funds += settings.defaultFundsPerProperty;
            }
            
            if(tile.unitId !== null) {
              for(var j = 0; j < units.length; ++j) {
                var unit = units[j];
                tile.unit = unit;
                if(unit.unitId == tile.unitId) {
                  // Heal units
                  if(unit.owner == nextPlayer.playerNumber && tileType.canRepair(unit.unitType().unitClass)) {
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
                callback({success: true, finished: false, inTurnNumber: game.inTurnNumber, changedTiles: nextPlayerTiles});
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
          callback({success: true, finished: result.finished, 
                   inTurnNumber: result.inTurnNumber, changedTiles: result.changedTiles});
        }
      });      
    } else {
      var game = result.game;
      this_.endTurn(game, userId, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason});
        } else {
          var firstChangedTiles = result.changedTiles;
          this_.startTurn(game, function(result) {
            if(!result.success) {
              callback({success: false, reason: result.reason});
            } else {
              var changedTiles = firstChangedTiles.concat(result.changedTiles);
              callback({success: true, finished: result.finished, inTurnNumber: result.inTurnNumber, changedTiles: changedTiles});
            }
          });
        }
      });
    }
  });
}

GameActions.prototype.surrender = function(gameId, userId) {
  
}