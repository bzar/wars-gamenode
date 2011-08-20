function ChatMessage(chatMessageId, gameId, userId, time, content) {
  this.chatMessageId = chatMessageId;
  this.gameId = gameId;
  this.userId = userId;
  this.time = time;
  this.content = content;
};

exports.ChatMessage = ChatMessage;

ChatMessage.prototype.clone = function() {
  var m = new ChatMessage(this.chatMessageId, this.gameId, this.userId, this.time, this.content);
  return m;
}

ChatMessage.prototype.cloneFrom = function(other) {
  this.chatMessageId = other.chatMessageId;
  this.gameId = other.gameId;
  this.userId = other.userId;
  this.time = other.time;
  this.content = other.content;
  
  return this;
}; 
