function Messenger(subscriptions) {
  this.subscriptions = subscriptions;
}

exports.Messenger = Messenger;

Messenger.prototype.sendGameEvents = function(gameId, events) {
  var preparedEvents = [];
  for(var i = 0; i < events.length; ++i) {
    var time = new Date();
    time.setTime(events[i].time);
    preparedEvents.push({
      time: time.toUTCString(),
      content: events[i].content
    });
  }
  
  this.subscriptions.forSubscribers(function(sub) {
    if(sub.client.stub.gameEvents)
      sub.client.stub.gameEvents(gameId, preparedEvents);
  }, "game-" + gameId);
}

Messenger.prototype.sendPlayerJoined = function(gameId, playerNumber, username, userId) {
  this.subscriptions.forSubscribers(function(sub) {
    var isMe = userId == sub.session.userId;
    if(sub.client.stub.playerJoined)
      sub.client.stub.playerJoined(gameId, playerNumber, username, isMe);
  }, "game-" + gameId);
}

Messenger.prototype.sendPlayerLeft = function(gameId, playerNumber) {
  this.subscriptions.forSubscribers(function(sub) {
    if(sub.client.stub.playerLeft)
      sub.client.stub.playerLeft(gameId, playerNumber);
  }, "game-" + gameId);
}

Messenger.prototype.sendGameStarted = function(gameId) {
  this.subscriptions.forSubscribers(function(sub) {
    if(sub.client.stub.gameStarted)
      sub.client.stub.gameStarted(gameId);
  }, "game-" + gameId);
}

Messenger.prototype.sendGameFinished = function(gameId) {
  this.subscriptions.forSubscribers(function(sub) {
    if(sub.client.stub.gameStarted)
      sub.client.stub.gameFinished(gameId);
  }, "game-" + gameId);
}

Messenger.prototype.sendGameTurnChange = function(gameId, inTurnNumber, roundNumber, turnRemaining) {
  this.subscriptions.forSubscribers(function(sub) {
    if(sub.client.stub.gameTurnChange)
      sub.client.stub.gameTurnChange(gameId, inTurnNumber, roundNumber, turnRemaining);
  }, "game-" + gameId);
}

Messenger.prototype.sendChatMessage = function(room, time, sender, message) {
  this.subscriptions.forSubscribers(function(sub) {
    if(sub.client.stub.chatMessage)
      sub.client.stub.chatMessage(time, sender, message);
  }, room);
}
