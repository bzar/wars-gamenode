var utils = require("../utils");

function GameProcedures(database) {
  this.database = database;
}

exports.GameProcedures = GameProcedures;

GameProcedures.prototype.surrenderPlayers = function(gameId, playerNumbers, callback) {
  var database = this.database;
  database.tiles(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    var tiles = result.tiles;
    
    database.units(gameId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      
      var changedTiles = [];
      var changedUnits = [];
      
      var units = result.units;
      
      for(var i = 0; i < tiles.length; ++i) {
        if(playerNumbers.indexOf(tiles[i].owner) != -1) {
          tiles[i].owner = 0;
          changedTiles.push(tiles[i]);
        }
      }
      
      for(var i = 0; i < units.length; ++i) {
        if(playerNumbers.indexOf(units[i].owner) != -1) {
          units[i].owner = 0;
          changedUnits.push(units[i]);
        }
      }
      database.updateTiles(changedTiles, function(result) {
        database.updateUnits(changedUnits, function(result) {
          callback({success: true});
        });
      });
    });
  });
}

GameProcedures.prototype.surrenderPlayer = function(gameId, playerNumber, callback) {
  var database = this.database;
  database.playerTiles(gameId, playerNumber, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    var tiles = result.tiles;
    
    database.playerUnits(gameId, playerNumber, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      
      var units = result.units;
      
      for(var i = 0; i < tiles.length; ++i) {
        tiles[i].owner = 0;
      }
      
      for(var i = 0; i < units.length; ++i) {
        units[i].owner = 0;
      }
      
      database.updateTiles(tiles, function(result) {
        database.updateUnits(units, function(result) {
          callback({success: true});
        });
      });
    });
  });
}

GameProcedures.prototype.automaticEndTurn = function(gameId, server) {
  utils.log("game", "Automatic turn change for game " + gameId);
  var mutex = server.gameMutex(gameId);
  var this_ = this;
  mutex.lock(function() {
    server.gameActions.nextTurn(gameId, null, function(result) {
      if(result.success) {
        if(result.untilNextTurn !== null) {
          server.timer.removeGroup(gameId);
          server.timer.addTimer(function() {
            this_.automaticEndTurn(gameId, server);
          }, result.untilNextTurn*1000, gameId);
        }
        server.messenger.sendGameEvents(gameId, result.events);
        if(result.finished) {
          server.messenger.sendGameFinished(gameId);
        } else {
          server.messenger.sendGameTurnChange(gameId, result.inTurnNumber, result.roundNumber, result.untilNextTurn);
        }
      } else {
        utils.log("error", "Error changing turn automatically: " + result.reason);
      }
      mutex.release();
    });
  });
}
