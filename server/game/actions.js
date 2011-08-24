var entities = require("../entities");
var settings = require("../settings").settings;
var GameLogic = require("../../client/gamelogic").GameLogic;
var GameProcedures = require("./procedures").GameProcedures;
var GameInformation = require("./information").GameInformation;

function GameActions(database) {
  this.database = database;
  this.gameProcedures = new GameProcedures(database);
  this.gameInformation = new GameInformation(database);
}

exports.GameActions = GameActions;

function checkMove(database, gameId, userId, unitId, destination, callback) {
  database.unitWithTile(unitId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    var unit = result.unit;
    var sourceTile = result.tile;
    
    var gameInformation = new GameInformation(database);
    gameInformation.gameData(gameId, function(result) {
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
      
      var gameLogic = new GameLogic(game, settings.gameElements);
      var destinationTile = null;
      
      if(destination !== null) {
        var canMove = gameLogic.unitCanMoveTo(sourceTile.x, sourceTile.y, destination.x, destination.y);
        if(canMove === null) {
          callback({success: false, reason: "Error determining path!"}); return;
        } else if(canMove === false) {
          callback({success: false, reason: "Unit cannot move there!"}); return;
        }
        
        destinationTile = game.getTile(destination.x, destination.y);
      }
      
      callback({success: true}, game, playerInTurn, unit, sourceTile, destinationTile, gameLogic);
    });
  });
}

GameActions.prototype.moveAndAttack = function(gameId, userId, unitId, destination, targetId, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, 
            function(result, game, player, unit, sourceTile, destinationTile, gameLogic) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    if(destinationTile.unit !== null && destinationTile.unit.unitId != unitId) {
      callback({success: false, reason: "Destination tile occupied!"}); return;
    }
    
    database.unit(targetId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      
      var target = result.unit;
      database.tile(target.tileId, function(result) {
        var targetTile = result.tile;
        targetTile.setUnit(target);
        
        if(target.owner == unit.owner) {
          callback({success: false, reason: "Cannot attack own units!"}); return;
        }
        
        var power = gameLogic.calculateDamage(unit, destinationTile, target, targetTile);
        if(power === null) {
          callback({success: false, reason: "Cannot attack target from destination!"}); return;
        }

        sourceTile.setUnit(null);
        destinationTile.setUnit(unit);
        target.health -= power;
        
        if(target.health > 0) {
          power = gameLogic.calculateDamage(target, targetTile, unit, destinationTile);
          if(power !== null) {
            unit.health -= power;
          }
        }
        
        unit.moved = true;

        var updatedUnits = [];
        var deletedUnits = [];
        if(unit.health <= 0) {
          destinationTile.setUnit(null);
          deletedUnits.push(unit);
        } else {
          updatedUnits.push(unit);
        }
        if(target.health <= 0) {
          targetTile.setUnit(null);
          deletedUnits.push(target);
        } else {
          updatedUnits.push(target);
        }
        database.deleteUnits(deletedUnits, function(result) {
          database.updateUnits(updatedUnits, function(result) {
            database.updateTiles([sourceTile, destinationTile, targetTile], function(result) {
              callback({success: true, changedTiles: [sourceTile, destinationTile, targetTile]});
            });
          });
        });
      });
    });
  });
}

GameActions.prototype.moveAndWait = function(gameId, userId, unitId, destination, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, 
            function(result, game, player, unit, sourceTile, destinationTile, gameLogic) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
            
    if(destinationTile.unit !== null && destinationTile.unit.unitId != unitId) {
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
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, 
            function(result, game, player, unit, sourceTile, destinationTile, gameLogic) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
            
    if(destinationTile.unit !== null && destinationTile.unit.unitId != unitId) {
      callback({success: false, reason: "Destination tile occupied!"}); return;
    }
    
    var canCapture = gameLogic.unitCanCapture(sourceTile.x, sourceTile.y, destinationTile.x, destinationTile.y);
    
    if(canCapture === null) {
      callback({success: false, reason: "Error determining if unit can capture!"}); return;
    } else if(canCapture == false) {
      callback({success: false, reason: "Unit cannot capture tile at destination!"}); return;
    }
    
    sourceTile.setUnit(null);
    destinationTile.setUnit(unit);
    unit.capture(destinationTile);
    
    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile, destinationTile], function(result) {
        callback({success: true, changedTiles: [sourceTile, destinationTile]});
      });
    });
  });
}

GameActions.prototype.moveAndDeploy = function(gameId, userId, unitId, destination, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, 
            function(result, game, player, unit, sourceTile, destinationTile, gameLogic) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
            
    if(destinationTile.unit !== null && destinationTile.unit.unitId != unitId) {
      callback({success: false, reason: "Destination tile occupied!"}); return;
    }
    
    var canDeploy = gameLogic.unitCanDeploy(sourceTile.x, sourceTile.y, destinationTile.x, destinationTile.y);
    
    if(canDeploy === null) {
      callback({success: false, reason: "Error determining if unit can deploy!"}); return;
    } else if(canDeploy == false) {
      callback({success: false, reason: "Unit cannot deploy!"}); return;
    }
    
    sourceTile.setUnit(null);
    destinationTile.setUnit(unit);
    unit.deploy();
    
    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile, destinationTile], function(result) {
        callback({success: true, changedTiles: [sourceTile, destinationTile]});
      });
    });
  });
}

GameActions.prototype.undeploy = function(gameId, userId, unitId, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, null, 
            function(result, game, player, unit, sourceTile, destinationTile, gameLogic) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    var canUndeploy = gameLogic.unitCanUndeploy(sourceTile.x, sourceTile.y);
    
    if(canUndeploy === null) {
      callback({success: false, reason: "Error determining if unit can undeploy!"}); return;
    } else if(canUndeploy == false) {
      callback({success: false, reason: "Unit cannot undeploy!"}); return;
    }
    
    unit.undeploy();
    
    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile], function(result) {
        callback({success: true, changedTiles: [sourceTile]});
      });
    });
  });  
}

GameActions.prototype.moveAndLoadInto = function(gameId, userId, unitId, carrierId, callback) {
  var database = this.database;
  database.unitWithTile(carrierId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    var carrier = result.unit;
    var carrierTile = result.tile;
    checkMove(database, gameId, userId, unitId, {x:carrierTile.x, y:carrierTile.y}, 
              function(result, game, player, unit, sourceTile, destinationTile, gameLogic) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
  
      var canLoad = gameLogic.unitCanLoadInto(sourceTile.x, sourceTile.y, carrierTile.x, carrierTile.y);
      
      if(canLoad === null) {
        callback({success: false, reason: "Error determining if unit can load!"}); return;
      } else if(canLoad == false) {
        callback({success: false, reason: "Unit cannot load here!"}); return;
      }
      
      sourceTile.setUnit(null);
      unit.loadInto(carrier);
      
      database.updateUnits([unit, carrier], function(result) {
        database.updateTiles([sourceTile], function(result) {
          callback({success: true, changedTiles: [sourceTile, carrierTile]});
        });
      });
    });
  });
}

GameActions.prototype.moveAndUnload = function(gameId, userId, carrierId, destination, unitId, unloadDestination, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, carrierId, destination, 
            function(result, game, player, unit, sourceTile, destinationTile, gameLogic) {
    database.unit(unitId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      
      var carriedUnit = result.unit;
      var unloadTargetOptions = gameLogic.unitUnloadTargetOptions(sourceTile.x, sourceTile.y, 
                                                              destinationTile.x, destinationTile.y, unitId);

      if(unloadTargetOptions === null) {
        callback({success: false, reason: "Error determining unload options!"}); return;
      }

      var canUnload = false;
      
      for(var i = 0; i < unloadTargetOptions.length; ++i) {
        if(unloadTargetOptions[i].x == unloadDestination.x && unloadTargetOptions[i].y == unloadDestination.y) {
          canUnload = true;
        }
      }
      
      if(canUnload == false) {
        callback({success: false, reason: "Unit cannot be unloaded here!"}); return;
      }
      
      sourceTile.setUnit(null);
      destinationTile.setUnit(unit);
      var unloadTile = game.getTile(unloadDestination.x, unloadDestination.y);
      carriedUnit.unloadFrom(unit);
      unloadTile.setUnit(carriedUnit);
      unit.moved = true;
      
      database.updateUnits([unit, carriedUnit], function(result) {
        database.updateTiles([sourceTile, destinationTile, unloadTile], function(result) {
          callback({success: true, changedTiles: [sourceTile, destinationTile, unloadTile]});
        });
      });
    });
  });
}

GameActions.prototype.build = function(gameId, userId, unitTypeId, destination, callback) {
  var database = this.database;
  database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    } else if(result.game.state != "inProgress") {
      callback({success: false, reason: "Game not in progress!"}); return;
    }
    
    var game = result.game;
    database.userPlayerInTurn(gameId, userId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      
      var player = result.player;
      database.tileAt(gameId, destination.x, destination.y, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        }
        
        var tile = result.tile;
        var tileType = tile.terrainType();
        var unitType = settings.gameElements.units[unitTypeId];
        
        if(tile.owner != player.playerNumber) {
          callback({success: false, reason: "Tile not owned by player!"}); return;
        } else if(!tileType.canBuild(unitTypeId)) {
          callback({success: false, reason: "Tile cannot build that unit type!"}); return;
        } else if(tile.unitId !== null) {
          callback({success: false, reason: "Tile is occupied!"}); return;
        } else if(unitType === undefined) {
          callback({success: false, reason: "Unknown unit type!"}); return;
        } else if(player.funds < unitType.price) {
          callback({success: false, reason: "Not enough funds!"}); return;
        }
        
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
      });
    });
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
    var numAlivePlayers = 0;
    database.tiles(game.gameId, function(result) {
      var tiles = result.tiles;
      database.units(game.gameId, function(result) {
        var units = result.units;
        for(var i = 1; i <= players.length; ++i) {
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
          if(stillAlive) {
            numAlivePlayers += 1;
            if(nextPlayer === null) {
              nextPlayer = player;
            }
          }
        }
        
        // Change turn
        if(nextPlayer.playerNumber == game.inTurnNumber || numAlivePlayers < 2) {
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
                    tile.regenerateCapturePoints();
                  }
                  break;
                }
              }
            } else {
              tile.beingCaptured = false;
              tile.regenerateCapturePoints();
            }
          }
          
          // Save tiles and units
          database.updateUnits(units, function(result) {
            database.updateTiles(nextPlayerTiles, function(result) {
              database.updateGame(game, function(result) {
                database.updatePlayer(nextPlayer, function(result) {
                  callback({success: true, finished: false, inTurnNumber: game.inTurnNumber, changedTiles: nextPlayerTiles});
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
  this.database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else if(result.game.state != "inProgress") {
      callback({success: false, reason: "Game not in progress!"});
    } else if(result.game.inTurnNumber == 0) {
      this_.startTurn(result.game, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        }
        callback({success: true, finished: result.finished, 
                  inTurnNumber: result.inTurnNumber, changedTiles: result.changedTiles});
      });      
    } else {
      var game = result.game;
      this_.endTurn(game, userId, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        } 
        var firstChangedTiles = result.changedTiles;
        this_.startTurn(game, function(result) {
          if(!result.success) {
            callback({success: false, reason: result.reason}); return;
          } 
          
          var changedTiles = firstChangedTiles.concat(result.changedTiles);
          callback({success: true, finished: result.finished, inTurnNumber: result.inTurnNumber, changedTiles: changedTiles});
        });
      });
    }
  });
}

GameActions.prototype.surrender = function(gameId, userId, callback) {
  var this_ = this;
  var database = this.database;
  database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    } else if(result.game.state != "inProgress") {
      callback({success: false, reason: "Game not in progress!"}); return;
    }
    var game = result.game;
    database.userPlayerInTurn(gameId, userId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      
      this_.gameProcedures.surrenderPlayer(game, result.player, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        }
        
        this_.nextTurn(gameId, userId, function(result) {
          var finished = result.finished;
          var inTurnNumber = result.inTurnNumber;
          database.tilesWithUnits(gameId, function(result) {
            callback({success: true, finished: finished, inTurnNumber: inTurnNumber, changedTiles: result.tiles});
          });
        });
      });
    });
  });
}