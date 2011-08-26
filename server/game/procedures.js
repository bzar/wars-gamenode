function GameProcedures(database) {
  this.database = database;
}

exports.GameProcedures = GameProcedures;

GameProcedures.prototype.surrenderPlayers = function(game, players, callback) {
  var database = this.database;
  database.tiles(game.gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    var tiles = result.tiles;
    
    database.units(game.gameId, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      
      var changedTiles = [];
      var deletedUnits = [];
      
      var units = result.units;
      
      var playerNumbers = players.map(function(x){ return x.playerNumber; });
      
      for(var i = 0; i < tiles.length; ++i) {
        if(playerNumbers.indexOf(tiles[i].owner) != -1) {
          tiles[i].owner = 0;
          changedTiles.push(tiles[i]);
        }
      }
      
      for(var i = 0; i < units.length; ++i) {
        if(playerNumbers.indexOf(units[i].owner) != -1) {
          deletedUnits.push(units[i]);
        }
      }
      database.updateTiles(changedTiles, function(result) {
        database.deleteUnits(deletedUnits, function(result) {
          callback({success: true});
        });
      });
    });
  });
}

GameProcedures.prototype.surrenderPlayer = function(game, player, callback) {
  var database = this.database;
  database.playerTiles(game.gameId, player.playerNumber, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    
    var tiles = result.tiles;
    
    database.playerUnits(game.gameId, player.playerNumber, function(result) {
      if(!result.success) {
        callback({success: false, reason: result.reason}); return;
      }
      
      var units = result.units;
      
      for(var i = 0; i < tiles.length; ++i) {
        tiles[i].owner = 0;
      }
      
      database.updateTiles(tiles, function(result) {
        database.deleteUnits(units, function(result) {
          callback({success: true});
        });
      });
    });
  });
}
