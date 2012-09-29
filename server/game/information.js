function GameInformation(database) {
  this.database = database;
}

exports.GameInformation = GameInformation;

GameInformation.prototype.gameData = function(gameId, callback) {
  var database = this.database;
  var this_ = this;
  database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    var game = result.game;
    this_.tilesWithUnits(gameId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      game.tiles = result.tiles;
      database.playersWithUsers(gameId, function(result) {
        if(!result.success) {
          callback({success: false, reason: result.reason}); return;
        }
        game.players = result.players;
        callback({success: true, game: game});
      });
    });
  });
}

GameInformation.prototype.playerInTurn = function(gameId, callback) {
  var database = this.database;
  database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    var game = result.game;
    database.players(gameId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      var players = result.players;

      for(var i = 0; i < players.length; ++i) {
        if(players[i].playerNumber == game.inTurnNumber) {
          callback({success: true, player: players[i]});
          return;
        }
      }
      callback({success: false, reason: "Player in turn not found!"});
    });
  });
}

function getCarriedUnits(unit, carriedUnits) {
  unit.carriedUnits = [];
  if(unit.unitId in carriedUnits) {
    carriedUnits[unit.unitId].forEach(function(carried) {
      unit.carriedUnits.push(getCarriedUnits(carried, carriedUnits));
    });
  }
  return unit;
}

GameInformation.prototype.tilesWithUnits = function(gameId, callback) {
  var database = this.database;
  database.tiles(gameId, function(result) {
    if(!result.success) { callback({success: false, reason: result.reason}); return; }
    var tiles = result.tiles;
    database.units(gameId, function(result) {
      if(!result.success) { callback({success: false, reason: result.reason}); return; }
      var allUnits = result.units;
      var carriedUnits = {};
      var carrierUnits = [];
      var units = {};

      allUnits.forEach(function(unit) {
        if(unit.carriedBy !== null) {
          if(carriedUnits[unit.carriedBy] === undefined) carriedUnits[unit.carriedBy] = [];
          carriedUnits[unit.carriedBy].push(unit);
        } else {
          units[unit.unitId] = unit;
        }

        if(unit.unitType().carryNum > 0) {
          carrierUnits.push(unit);
        }
      });

      carrierUnits.forEach(function(unit) {
        getCarriedUnits(unit, carriedUnits);
      });

      tiles.forEach(function(tile) {
        if(tile.unitId !== null && units.hasOwnProperty(tile.unitId)) {
          tile.setUnit(units[tile.unitId]);
        } else {
          tile.setUnit(null);
        }
      });

      callback({success: true, tiles: tiles})
    });
  });
}

GameInformation.prototype.unitWithTile = function(unitId, callback) {
  var database = this.database;
  database.unit(unitId, function(result) {
    if(!result.success) { callback(result); return; }
    var unit = result.unit;
    var tile = null
    if(unit.tileId === null) {
      callback({success: true, unit: unit, tile: null});
    } else {
      database.tile(unit.tileId, function(result) {
        if(!result.success) { callback(result); return; }
        var tile = result.tile;
        tile.setUnit(unit);
        callback({success: true, unit: unit, tile: tile});
      });
    }
  });
}