function Game(gameId, authorId, name, mapId, state, turnStart, turnNumber, roundNumber, inTurnNumber, settings) {
  this.gameId = gameId;
  this.authorId = authorId;
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
  var g = new Game(this.gameId, this.authorId, this.name, this.mapId, this.state, this.turnStart, 
                   this.turnNumber, this.roundNumber, this.inTurnNumber, 
                   {public: this.settings.public, turnLength: this.settings.turnLength});
  return g;
}

Game.prototype.cloneFrom = function(other) {
  this.gameId = other.gameId;
  this.authorId = other.authorId;
  this.name = other.name;
  this.mapId = other.mapId;
  this.state = other.state;
  this.turnStart = other.turnStart;
  this.turnNumber = other.turnNumber;
  this.roundNumber = other.roundNumber;
  this.inTurnNumber = other.inTurnNumber;
  this.settings = {
    public: other.settings.public,
    turnLength: other.settings.turnLength
  }
  return this;
}