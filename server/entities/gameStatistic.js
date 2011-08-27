function GameStatistic(gameStatisticId, gameId, turnNumber, roundNumber, inTurnNumber, content) {
  this.gameStatisticId = gameStatisticId;
  this.gameId = gameId;
  this.turnNumber = turnNumber;
  this.roundNumber = roundNumber;
  this.inTurnNumber = inTurnNumber;
  this.content = content;
};

exports.GameStatistic = GameStatistic;

GameStatistic.prototype.clone = function() {
  var e = new GameStatistic(this.gameStatisticId, this.gameId, this.turnNumber, 
                            this.roundNumber, this.inTurnNumber, this.content);
  return e;
}

GameStatistic.prototype.cloneFrom = function(other) {
  this.gameStatisticId = other.gameStatisticId;
  this.gameId = other.gameId;
  this.turnNumber = other.turnNumber;
  this.roundNumber = other.roundNumber;
  this.inTurnNumber = other.inTurnNumber;
  this.content = other.content;
  
  return this;
}; 
