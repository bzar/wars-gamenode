function Player() {
  this.playerId = null;
  this.gameId = null;
  this.userId = null;
  this.playerNumber = null;
  this.funds = null;
  this.score = null;
  this.settings = {
    emailNotifications: null
  };
};

exports.Player = Player;

Player.prototype.clone = function() {
  var p = new Player();
  p.playerId = this.playerId;
  p.gameId = this.gameId;
  p.userId = this.userId;
  p.playerNumber = this.playerNumber;
  p.funds = this.funds;
  p.score = this.score;
  p.settings.emailNotifications = this.settings.emailNotifications;
  return p;
}
