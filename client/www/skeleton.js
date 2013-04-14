// Generated by CoffeeScript 1.4.0
(function() {
  var Skeleton;

  Skeleton = (function() {

    function Skeleton(server) {
      this.server = server;
    }

    return Skeleton;

  })();

  Skeleton.prototype.playerJoined = function(gameId, playerNumber, playerName, isMe) {};

  Skeleton.prototype.playerLeft = function(gameId, playerNumber) {};

  Skeleton.prototype.bannedUnits = function(unitTypes) {};

  Skeleton.prototype.gameStarted = function(gameId) {};

  Skeleton.prototype.gameFinished = function(gameId) {};

  Skeleton.prototype.gameTurnChange = function(gameId, newTurn, newRound, turnRemaining) {};

  Skeleton.prototype.gameEvents = function(gameId, events) {};

  Skeleton.prototype.chatMessage = function(messageInfo) {};

  Skeleton.prototype.addInvite = function(gameId) {};

  Skeleton.prototype.removeInvite = function(gameId) {};

  (typeof exports !== "undefined" && exports !== null ? exports : this).Skeleton = Skeleton;

}).call(this);
