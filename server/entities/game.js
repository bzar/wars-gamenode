function Game() {
  this.gameId = null;
  this.mapId = null;
  this.state = null;
  this.turnStart = null;
  this.turnNumber = null;
  this.roundNumber = null;
  this.inTurnNumber = null;
  this.settings = {
    public: null,
    turnLength: null
  }
};

exports.Game = Game;