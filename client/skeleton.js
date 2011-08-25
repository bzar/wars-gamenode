function Skeleton(server) {
    this.server = server;
}

Skeleton.prototype.playerJoined = function(playerNumber, playerName, isMe) {
}

Skeleton.prototype.playerLeft = function(playerNumber) {
}

Skeleton.prototype.unitBanned = function(unitType) {
}

Skeleton.prototype.unitUnbanned = function(unitType) {
}

Skeleton.prototype.gameStarted = function(gameId) {
}

Skeleton.prototype.gameFinished = function(gameId) {
}

Skeleton.prototype.gameUpdate = function(gameId, tileChanges) {
}

Skeleton.prototype.gameTurnChange = function(gameId, newTurn) {
}

Skeleton.prototype.gameEvents = function(gameId, events) {
}

Skeleton.prototype.chatMessage = function(messageInfo) {
}
