function GameProcedures(database) {
  this.database = database;
}

exports.GameProcedures = GameProcedures;

GameProcedures.prototype.surrender = function(game, playerNumber) {
  for(var i = 0; i < game.tiles.length; ++i) {
    var tile = game.tiles[i];
    if(tile.owner == playerNumber) {
      tile.owner = 0;
    }
    if(tile.unit !== null && tile.unit.owner == playerNumber) {
      tile.unit = null;
    }
  }
}
