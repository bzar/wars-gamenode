function Skeleton(server) {
    this.server = server;
}

Skeleton.prototype.playerJoined = function(gameId, playerNumber, playerName, isMe) {
}

Skeleton.prototype.playerLeft = function(gameId, playerNumber) {
}

Skeleton.prototype.unitBanned = function(unitType) {
}

Skeleton.prototype.unitUnbanned = function(unitType) {
}

Skeleton.prototype.gameStarted = function(gameId) {
}

Skeleton.prototype.gameFinished = function(gameId) {
}

Skeleton.prototype.gameTurnChange = function(gameId, newTurn, newRound, turnRemaining) {
}

Skeleton.prototype.gameEvents = function(gameId, events) {
}

Skeleton.prototype.chatMessage = function(messageInfo) {
}
