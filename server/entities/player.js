function Player(playerId, gameId, userId, playerNumber, funds, score, settings) {
  this.playerId = playerId;
  this.gameId = gameId;
  this.userId = userId;
  this.playerNumber = playerNumber;
  this.funds = funds;
  this.score = score;
  this.settings = {
    emailNotifications: settings.emailNotifications
  };
};

exports.Player = Player;

Player.prototype.clone = function() {
  var p = new Player(this.playerId, this.gameId, this.userId, this.playerNumber, this.funds, this.score, 
                     {emailNotifications: this.settings.emailNotifications});
  return p;
}
