function Game(gameId, name, mapId, state, turnStart, turnNumber, roundNumber, inTurnNumber, settings) {
  this.gameId = gameId;
  this.name = name;
  this.mapId = mapId;
  this.state = state;
  this.turnStart = turnStart;
  this.turnNumber = turnNumber;
  this.roundNumber = roundNumber;
  this.inTurnNumber = inTurnNumber;
  this.settings = {
    public: settings.public,
    turnLength: settings.turnLength
  }
};

exports.Game = Game;

Game.prototype.clone = function() {
  var g = new Game(this.gameId, this.name, this.mapId, this.state, this.turnStart, 
                   this.turnNumber, this.roundNumber, this.inTurnNumber, 
                   {public: this.settings.public, turnLength: this.settings.turnLength});
  return g;
}