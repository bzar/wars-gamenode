var entities = require("../entities");
var settings = require("../settings").settings;
var email = require("../email");
var GameLogic = require("../../client/GameLogic").GameLogic;
var GameProcedures = require("./procedures").GameProcedures;
var GameInformation = require("./information").GameInformation;
var GameEventManager = require("./eventManager").GameEventManager;

function GameActions(database) {
  this.database = database;
  this.gameProcedures = new GameProcedures(database);
  this.gameInformation = new GameInformation(database);
}

exports.GameActions = GameActions;

function checkMove(database, gameId, userId, unitId, destination, path, callback) {
  var gameInformation = new GameInformation(database);
  gameInformation.unitWithTile(unitId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }

    if(result.tile === null) {
      callback({success: false, reason: "Unit is inside a carrier!"}); return;
    }

    var unit = result.unit;
    var sourceTile = result.tile;

    if(unit.moved) {
      callback({success: false, reason: "Unit already moved!"}); return;
    }

    gameInformation.gameData(gameId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }

      var game = result.game;
      if(game.state != game.STATE_IN_PROGRESS) {
        callback({success: false, reason: "Game not in progress!"}); return;
      }

      var playerInTurn = game.playerInTurn();
      if(playerInTurn.userId != userId) {
        callback({success: false, reason: "User not in turn!"}); return;
      }

      var gameLogic = new GameLogic(game, settings.gameElements);
      var destinationTile = null;
      if(destination !== null) {
        if(!gameLogic.unitCanMovePath(sourceTile.x, sourceTile.y, destination.x, destination.y, path)) {
          callback({success: false, reason: "Error determining path!"}); return;
        }

        destinationTile = game.getTile(destination.x, destination.y);
      }

      callback({success: true}, game, playerInTurn, unit, sourceTile, destinationTile, path, gameLogic);
    });
  });
}

GameActions.prototype.moveAndAttack = function(gameId, userId, unitId, destination, path, targetId, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, path,
            function(result, game, player, unit, sourceTile, destinationTile, path, gameLogic) {
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

        database.gamePlayer(gameId, target.owner, function(result) {
          var targetPlayer = result.player;

          var power = gameLogic.calculateDamage(unit, destinationTile, target, targetTile);
          if(power === null) {
            callback({success: false, reason: "Cannot attack target from destination!"}); return;
          }

          var events = new GameEventManager(gameId);
          events.move(unit, destinationTile, path);
          sourceTile.setUnit(null);
          destinationTile.setUnit(unit);

          var updatedUnits = [];
          var deletedUnits = [];

          events.attack(unit, destinationTile, target, power);

          if(targetPlayer)
            targetPlayer.score -= parseInt(Math.min(target.health, power) * target.unitType().price / 100);

          player.score += parseInt(Math.min(target.health, power) * target.unitType().price / 100);
          target.health -= power;
          unit.moved = true;

          if(target.health > 0) {
            power = gameLogic.calculateDamage(target, targetTile, unit, destinationTile);
            events.counterattack(target, unit, power);
            if(power !== null) {
              unit.health = unit.health - power;
              player.score -= parseInt(Math.min(unit.health, power) * unit.unitType().price / 100);
              if(targetPlayer)
                targetPlayer.score += parseInt(Math.min(unit.health, power) * unit.unitType().price / 100);
            }
            updatedUnits.push(target);
          } else {
            events.destroyed(target);
            targetTile.setUnit(null);
            deletedUnits.push(target);
          }

          if(unit.health <= 0) {
            events.destroyed(unit);
            destinationTile.setUnit(null);
            deletedUnits.push(unit);
          } else {
            updatedUnits.push(unit);
          }

          function getCarriedUnits(units) {
            var carried = [];
            for(var i = 0; i < units.length; ++i) {
              var unit = units[i];
              if(unit.carriedUnits && unit.carriedUnits.length > 0) {
                carried = carried.concat(unit.carriedUnits).concat(getCarriedUnits(unit.carriedUnits));
              }
            }
            return carried;
          }

          deletedUnits = deletedUnits.concat(getCarriedUnits(deletedUnits));

          database.deleteUnits(deletedUnits, function(result) {
            database.updateUnits(updatedUnits, function(result) {
              database.updateTiles([sourceTile, destinationTile, targetTile], function(result) {
                database.updatePlayers(targetPlayer ? [player, targetPlayer] : [player], function(result) {
                  database.createGameEvents(events.objects, function(result) {
                    callback({success: true, events: events.objects});
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

GameActions.prototype.moveAndWait = function(gameId, userId, unitId, destination, path, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, path,
            function(result, game, player, unit, sourceTile, destinationTile, path, gameLogic) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }

    if(destinationTile.unit !== null && destinationTile.unit.unitId != unitId) {
      callback({success: false, reason: "Destination tile occupied!"}); return;
    }

    var events = new GameEventManager(gameId);
    events.move(unit, destinationTile, path);
    sourceTile.setUnit(null);
    destinationTile.setUnit(unit);
    unit.wait();
    events.wait(unit);

    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile, destinationTile], function(result) {
        callback({success: true, events: events.objects});
      });
    });
  });
}

GameActions.prototype.moveAndCapture = function(gameId, userId, unitId, destination, path, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, path,
            function(result, game, player, unit, sourceTile, destinationTile, path, gameLogic) {
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

    var events = new GameEventManager(gameId);
    events.move(unit, destinationTile, path);
    sourceTile.setUnit(null);
    destinationTile.setUnit(unit);
    unit.capture(destinationTile);

    if(destinationTile.owner != unit.owner) {
      events.capture(unit, destinationTile, destinationTile.capturePoints);
    } else {
      events.captured(unit, destinationTile);
    }

    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile, destinationTile], function(result) {
        database.createGameEvents(events.objects, function(result) {
          callback({success: true, events: events.objects});
        });
      });
    });
  });
}

GameActions.prototype.moveAndDeploy = function(gameId, userId, unitId, destination, path, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, destination, path,
            function(result, game, player, unit, sourceTile, destinationTile, path, gameLogic) {
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

    var events = new GameEventManager(gameId);
    events.move(unit, destinationTile, path);

    sourceTile.setUnit(null);
    destinationTile.setUnit(unit);
    unit.deploy();

    events.deploy(unit);

    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile, destinationTile], function(result) {
        database.createGameEvents(events.objects, function(result) {
          callback({success: true, events: events.objects});
        });
      });
    });
  });
}

GameActions.prototype.undeploy = function(gameId, userId, unitId, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, unitId, null, null,
            function(result, game, player, unit, sourceTile, destinationTile, path, gameLogic) {
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

    var events = new GameEventManager(gameId);
    events.undeploy(unit);

    database.updateUnit(unit, function(result) {
      database.updateTiles([sourceTile], function(result) {
        database.createGameEvents(events.objects, function(result) {
          callback({success: true, events: events.objects});
        });
      });
    });
  });
}

GameActions.prototype.moveAndLoadInto = function(gameId, userId, unitId, carrierId, path, callback) {
  var database = this.database;
  var gameInformation = new GameInformation(database);
  gameInformation.unitWithTile(carrierId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }

    var carrier = result.unit;
    var carrierTile = result.tile;
    checkMove(database, gameId, userId, unitId, {x:carrierTile.x, y:carrierTile.y}, path,
              function(result, game, player, unit, sourceTile, destinationTile, path, gameLogic) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }

      var canLoad = gameLogic.unitCanLoadInto(sourceTile.x, sourceTile.y, carrierTile.x, carrierTile.y);

      if(canLoad === null) {
        callback({success: false, reason: "Error determining if unit can load!"}); return;
      } else if(canLoad == false) {
        callback({success: false, reason: "Unit cannot load here!"}); return;
      }

      var events = new GameEventManager(gameId);
      events.move(unit, destinationTile, path);

      sourceTile.setUnit(null);
      unit.loadInto(carrier);

      events.load(unit, carrier);

      database.updateUnits([unit, carrier], function(result) {
        database.updateTiles([sourceTile], function(result) {
          database.createGameEvents(events.objects, function(result) {
            callback({success: true, events: events.objects});
          });
        });
      });
    });
  });
}

GameActions.prototype.moveAndUnload = function(gameId, userId, carrierId, destination, path, unitId, unloadDestination, callback) {
  var database = this.database;
  checkMove(database, gameId, userId, carrierId, destination, path,
            function(result, game, player, unit, sourceTile, destinationTile, path, gameLogic) {
    if(!result.success) {
      callback(result); return;
    }

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

      var events = new GameEventManager(gameId);
      events.move(unit, destinationTile, path);

      sourceTile.setUnit(null);
      destinationTile.setUnit(unit);
      var unloadTile = game.getTile(unloadDestination.x, unloadDestination.y);
      carriedUnit.unloadFrom(unit);
      unloadTile.setUnit(carriedUnit);
      unit.moved = true;

      events.unload(carriedUnit, unit, unloadTile);

      database.updateUnits([unit, carriedUnit], function(result) {
        database.updateTiles([sourceTile, destinationTile, unloadTile], function(result) {
          database.createGameEvents(events.objects, function(result) {
            callback({success: true, events: events.objects});
          });
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
    } else if(result.game.state != result.game.STATE_IN_PROGRESS) {
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
          database.createUnit(gameId, unit, function(result) {
            tile.unitId = result.unitId;
            unit.unitId = result.unitId;
            tile.unit = unit;

            var events = new GameEventManager(gameId);
            events.build(tile, unit);

            database.updateTile(tile, function(result) {
              database.createGameEvents(events.objects, function(result) {
                callback({success: true, events: events.objects});
              });
            });
          });
        });
      });
    });
  });
}

GameActions.prototype.endTurn = function(game, userId, callback) {
  var database = this.database;

  function endTurn(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason});
    } else {
      var previousPlayer = result.player;

      var events = new GameEventManager(game.gameId);
      events.endTurn(previousPlayer);

      // Clean up last turn
      database.tiles(game.gameId, function(result) {
        var tiles = result.tiles;
        database.playerUnits(game.gameId, previousPlayer.playerNumber, function(result) {
          var previousPlayerUnits = result.units;
          for(var i = 0; i < previousPlayerUnits.length; ++i) {
            var unit = previousPlayerUnits[i];
            for(var j = 0; j < tiles.length; ++j) {
              var tile = tiles[j];
              if(tile.tileId == unit.tileId) {
                tile.unit = unit;
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
              database.createGameEvents(events.objects, function(result) {
                callback({success: true, events: events.objects});
              });
            }
          });
        });
      });
    }
  };

  if(userId !== null) {
    database.userPlayerInTurn(game.gameId, userId, endTurn);
  } else {
    var gameInformation = new GameInformation(database);
    gameInformation.playerInTurn(game.gameId, endTurn);
  }
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
        var stats = [];
        for(var i = 1; i <= players.length; ++i) {
          var player = players[(currentIndex + i) % players.length];

          if(player.userId == null)
            continue;

          var playerStats = {
            playerNumber: player.playerNumber,
            power: 0,
            property: 0,
            score: player.score
          }

          var stillAlive = false;
          for(var j = 0; j < units.length; ++j) {
            var unit = units[j];
            if(unit.owner == player.playerNumber) {
              stillAlive = true;
              playerStats.power += parseInt(unit.unitType().price * unit.health / 100);
            }
          }

          for(var j = 0; j < tiles.length; ++j) {
            var tile = tiles[j];
            var tileType = tile.terrainType();
            if(tile.owner == player.playerNumber) {
              if(tileType.builds() && tile.unitId == null) {
                stillAlive = true;
              }
              playerStats.property += tile.capturePoints;
            }
          }
          if(stillAlive) {
            numAlivePlayers += 1;
            if(nextPlayer === null) {
              nextPlayer = player;
            }
          }

          stats.push(playerStats);
        }

        // Change turn
        var events = new GameEventManager(game.gameId);
        if(nextPlayer.playerNumber == game.inTurnNumber || numAlivePlayers < 2) {
          game.state = game.STATE_FINISHED;
          events.gameFinished(nextPlayer);
          database.updateGame(game, function(result) {
            database.createGameEvents(events.objects, function(result) {
              callback({success: true, finished: true, events: events.objects});
            });
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
              events.produceFunds(tile);
              nextPlayer.funds += settings.defaultFundsPerProperty;
              nextPlayer.score += settings.defaultFundsPerProperty;
            }

            if(tile.unitId !== null) {
              for(var j = 0; j < units.length; ++j) {
                var unit = units[j];
                tile.unit = unit;
                if(unit.unitId == tile.unitId) {
                  // Heal units
                  if(unit.owner == nextPlayer.playerNumber && tileType.canRepair(unit.type) && unit.health < 100) {
                    nextPlayer.score += unit.heal(settings.defaultRepairRate);
                    events.repair(tile, unit, unit.health);
                  }
                  // Handle capturing
                  if(!unit.capturing && tile.capturePoints < settings.maxCapturePoints) {
                    tile.beingCaptured = false;
                    tile.regenerateCapturePoints();
                    events.regenerateCapturePoints(tile, tile.capturePoints);
                  }
                  break;
                }
              }
            } else {
              tile.beingCaptured = false;
              tile.regenerateCapturePoints();
              events.regenerateCapturePoints(tile, tile.capturePoints);
            }
          }

          var gameStatistic = new entities.GameStatistic(null, game.gameId, game.turnNumber,
                                                         game.roundNumber, game.inTurnNumber, stats);

          game.turnStart = new Date().getTime() / 1000;
          var untilNextTurn = game.turnRemaining();

          events.beginTurn(nextPlayer);

          // Save tiles and units
          database.updateUnits(units, function(result) {
            database.updateTiles(nextPlayerTiles, function(result) {
              database.updateGame(game, function(result) {
                database.updatePlayer(nextPlayer, function(result) {
                  database.createGameEvents(events.objects, function(result) {
                    database.createGameStatistic(gameStatistic, function(result) {
                      database.user(nextPlayer.userId, function(result) {
                        email.sendTurnNotification(game, nextPlayer, result.user);
                        callback({success: true, finished: false, inTurnNumber: game.inTurnNumber, roundNumber: game.roundNumber,
                                  events: events.objects, untilNextTurn: untilNextTurn});
                      });
                    });
                  });
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
    } else if(result.game.state != result.game.STATE_IN_PROGRESS) {
      callback({success: false, reason: "Game not in progress!"});
    } else if(result.game.inTurnNumber == 0) {
      this_.startTurn(result.game, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        }
        callback({success: true, finished: result.finished,
                  inTurnNumber: result.inTurnNumber, events: result.events,
                  untilNextTurn: result.untilNextTurn});
      });
    } else {
      var game = result.game;
      this_.endTurn(game, userId, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        }
        var firstEvents = result.events;
        this_.startTurn(game, function(result) {
          if(!result.success) {
            callback({success: false, reason: result.reason}); return;
          }

          var events = firstEvents.concat(result.events);
          callback({success: true, finished: result.finished, inTurnNumber: result.inTurnNumber, roundNumber: game.roundNumber,
                    events: events, untilNextTurn: result.untilNextTurn});
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
    } else if(result.game.state != result.game.STATE_IN_PROGRESS) {
      callback({success: false, reason: "Game not in progress!"}); return;
    }
    var game = result.game;
    database.userPlayerInTurn(gameId, userId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      var player = result.player;

      this_.gameProcedures.surrenderPlayer(game, player, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        }

        var events = new GameEventManager(gameId);
        events.surrender(player);

        this_.nextTurn(gameId, userId, function(result) {
          events.objects = events.objects.concat(result.events);
          var finished = result.finished;
          var inTurnNumber = result.inTurnNumber;
          var untilNextTurn = result.untilNextTurn;
          this_.gameInformation.tilesWithUnits(gameId, function(result) {
            database.createGameEvents(events.objects, function(result) {
              callback({success: true, finished: finished, inTurnNumber: inTurnNumber,
                       events: events.objects, untilNextTurn: untilNextTurn});
            });
          });
        });
      });
    });
  });
}