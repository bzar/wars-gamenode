function GameInformation(database) {
  this.database = database;
}

exports.GameInformation = GameInformation;

GameInformation.prototype.gameData = function(gameId, callback) {
  var database = this.database;
  database.game(gameId, function(result) {
    if(!result.success) {
      callback({success: false, reason: result.reason}); return;
    }
    var game = result.game;
    database.tilesWithUnits(gameId, function(result) {
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