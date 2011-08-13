function Skeleton(server) {
    this.server = server;
    this.onPlayerJoined = function(){};
    this.onPlayerLeft = function(){};
    this.onUnitBanned = function(){};
    this.onUnitUnbanned = function(){};
    this.onGameStarted = function(){};
    this.onGameUpdate = function(){};
    this.onGameTurnChange = function(){};
    this.onTickerMessage = function(){};
    this.onChatMessage = function(){};
}

Skeleton.prototype.playerJoined = function(playerInfo) {
  this.onPlayerJoined(playerInfo);
}

Skeleton.prototype.playerLeft = function(playerInfo) {
  this.onPlayerLeft(playerInfo);
}

Skeleton.prototype.unitBanned = function(unitInfo) {
  this.onUnitBanned(unitInfo);
}

Skeleton.prototype.unitUnbanned = function(unitType) {
  this.onUnitUnbanned(unitInfo);
}

Skeleton.prototype.gameStarted = function(gameId) {
  this.onGameStarted(gameId);
}

Skeleton.prototype.gameFinished = function(gameId) {
  this.onGameStarted(gameId);
}

Skeleton.prototype.gameUpdate = function(info) {
  this.onGameUpdate(info.gameId, info.tileChanges);
}

Skeleton.prototype.gameTurnChange = function(info) {
  this.onGameTurnChange(info.gameId, info.inTurnNumber);
}


Skeleton.prototype.tickerMessage = function(tickerMessage) {
  this.onTickerMessage(tickerMessage);
}

Skeleton.prototype.chatMessage = function(messageInfo) {
  this.onChatMessage(messageInfo);
}
