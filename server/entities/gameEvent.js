function GameEvent(gameEventId, gameId, time, content) {
  this.gameEventId = gameEventId;
  this.gameId = gameId;
  this.time = time;
  this.content = content;
};

exports.GameEvent = GameEvent;

GameEvent.prototype.clone = function() {
  var e = new GameEvent(this.gameEventId, this.gameId, this.time, this.content);
  return e;
}

GameEvent.prototype.cloneFrom = function(other) {
  this.gameEventId = other.gameEventId;
  this.gameId = other.gameId;
  this.time = other.time;
  this.content = other.content;
  
  return this;
}; 
