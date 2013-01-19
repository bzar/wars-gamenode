function Player(playerId, gameId, userId, playerNumber, teamNumber, playerName, funds, score, settings) {
  this.playerId = playerId;
  this.gameId = gameId;
  this.userId = userId;
  this.playerNumber = playerNumber;
  this.teamNumber = teamNumber;
  this.playerName = playerName;
  this.funds = funds;
  this.score = score;
  this.settings = {
    emailNotifications: settings.emailNotifications,
    hidden: settings.hidden ? settings.hidden : false
  };
};

exports.Player = Player;

Player.prototype.clone = function() {
  var p = new Player(this.playerId, this.gameId, this.userId, this.playerNumber, this.teamNumber,this.playerName,
                     this.funds, this.score, {emailNotifications: this.settings.emailNotifications});
  return p;
}

Player.prototype.cloneFrom = function(other) {
  this.playerId = other.playerId;
  this.gameId = other.gameId;
  this.userId = other.userId;
  this.playerNumber = other.playerNumber;
  this.teamNumber = other.teamNumber;
  this.playerName = other.playerName;
  this.funds = other.funds;
  this.score = other.score;
  this.settings = {
    emailNotifications: other.settings.emailNotifications,
    hidden: other.settings.hidden ? other.settings.hidden : false
  };
  
  return this;
};
