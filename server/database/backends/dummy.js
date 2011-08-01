var entities = require("../../entities");

var DummyDatabase = function() {
}

exports.implementation = DummyDatabase;

// GAME MANAGEMENT

DummyDatabase.prototype.game = function(gameId, callback) {
  setTimeout(function() {
    callback(new entities.Game());
  }, 0);
}

DummyDatabase.prototype.createGame = function(game, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.joinGame = function(userId, gameId, playerNumber, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.leaveGame = function(userId, gameId, playerNumber, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.startGame = function(gameId, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.deleteGame = function(gameId, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.openGames = function(callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.myGames = function(userId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.players = function(gameId, callback) {
  setTimeout(function() {
    callback(new Object());
  }, 0);
}

DummyDatabase.prototype.player = function(gameId, playerId, callback) {
  setTimeout(function() {
    callback(new entities.Player());
  }, 0);
}

DummyDatabase.prototype.updatePlayer = function(gameId, playerId, player, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

// MAP MANAGEMENT

DummyDatabase.prototype.createMap = function(newMap, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.updateMap = function(mapId, map, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.map = function(mapId, callback) {
  setTimeout(function() {
    callback(new entities.Map());
  }, 0);
}

DummyDatabase.prototype.mapTiles = function(mapId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.maps = function(callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.myMaps = function(userId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

// PROFILE MANAGEMENT

DummyDatabase.prototype.saveProfile = function(userId, profile, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.profile = function(userId, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

// USER MANAGEMENT

DummyDatabase.prototype.userId = function(username, password, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.user = function(userId, callback) {
  setTimeout(function() {
    callback(new entities.User());
  }, 0);
}

DummyDatabase.prototype.updateUser = function(userId, newUser, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.register = function(newUser, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

// GAME ENTITY MANAGEMENT

DummyDatabase.prototype.unit = function(gameId, unitId, callback) {
  setTimeout(function() {
    callback(new entities.Unit());
  }, 0);
}

DummyDatabase.prototype.unitAt = function(gameId, x, y, callback) {
  setTimeout(function() {
    callback(new entities.Unit());
  }, 0);
}

DummyDatabase.prototype.units = function(gameId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.myUnits = function(gameId, playerId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.createUnit = function(gameId, unit, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.updateUnit = function(gameId, unitId, unit, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.deleteUnit = function(gameId, unitId, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.tile = function(gameId, tileId, callback) {
  setTimeout(function() {
    callback();
  }, 0);
}

DummyDatabase.prototype.tileAt = function(gameId, x, y, callback) {
  setTimeout(function() {
    callback(new entities.Tile());
  }, 0);
}

DummyDatabase.prototype.tiles = function(gameId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.myTiles = function(gameId, playerId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.createTile = function(gameId, tile, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.updateTile = function(gameId, tileId, tile, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

// CHAT

DummyDatabase.prototype.createChatMessage = function(gameId, chatMessage, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.chatMessages = function(gameId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

// GAME EVENT TICKER

DummyDatabase.prototype.createTickerMessage = function(gameId, content, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}

DummyDatabase.prototype.tickerMessages = function(gameId, count, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

// GAME STATISTICS

DummyDatabase.prototype.gameStatistics = function(gameId, callback) {
  setTimeout(function() {
    callback(new Array());
  }, 0);
}

DummyDatabase.prototype.createTurnStatistics = function(gameId, turnStatistics, callback) {
  setTimeout(function() {
    callback(null);
  }, 0);
}
