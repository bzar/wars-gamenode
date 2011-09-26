var entities = require("../../entities");
var settings = require("../../settings").settings;
var utils = require("../../utils");

var DummyDatabase = function() {
}

exports.implementation = DummyDatabase;


// GAME MANAGEMENT

DummyDatabase.prototype.game = function(gameId, callback) {
  callback({success: true, game: null});
}

DummyDatabase.prototype.createGame = function(game, gameData, players, callback) {
  callback({success: true, gameId: 0});
}

DummyDatabase.prototype.updateGame = function(game, callback) {
  callback({success: true});
}
DummyDatabase.prototype.deleteGame = function(gameId, callback) {
  callback({success: true});
}

DummyDatabase.prototype.openGames = function(callback) {
  callback({success: true, games: []});
}

DummyDatabase.prototype.publicGames = function(callback) {
  callback({success: true, games: []});
}

DummyDatabase.prototype.myGames = function(userId, callback) {
  callback({success: true, games: []});
}

DummyDatabase.prototype.players = function(gameId, callback) {
  callback({success: true, players: []});
}

DummyDatabase.prototype.playersWithUsers = function(gameId, callback) {
  callback({success: true, players: []});
}

DummyDatabase.prototype.gamePlayer = function(gameId, playerNumber, callback) {
  callback({success: true, player: null});
}

DummyDatabase.prototype.userPlayerInTurn = function(gameId, userId, callback) {
  callback({success: true, player: null});
}

DummyDatabase.prototype.player = function(playerId, callback) {
  callback({success: true, player: null});
}

DummyDatabase.prototype.updatePlayer = function(player, callback) {
  callback({success: true});
}

DummyDatabase.prototype.updatePlayers = function(players, callback) {
  callback({success: true});
}

// MAP MANAGEMENT

DummyDatabase.prototype.createMap = function(newMap, callback) {
  callback({success: true, mapId: 0});
}

DummyDatabase.prototype.updateMap = function(map, callback) {
  callback({success: true});
}

DummyDatabase.prototype.map = function(mapId, callback) {
  callback({success: true, map: null});
}

DummyDatabase.prototype.mapData = function(mapId, callback) {
  callback({success: true, mapData: null});
}

DummyDatabase.prototype.maps = function(callback) {
  callback({success: true, maps: []});
}

DummyDatabase.prototype.myMaps = function(userId, callback) {
  callback({success: true, maps: []});
}

// USER MANAGEMENT

DummyDatabase.prototype.userByName = function(username, callback) {
  callback({success: true, userId: 0});
}

DummyDatabase.prototype.user = function(userId, callback) {
  callback({success: true, user: null});
}

DummyDatabase.prototype.updateUser = function(user, callback) {
  callback({success: true});
}

DummyDatabase.prototype.register = function(newUser, callback) {
  callback({success: true, userId: 0});
}

// GAME ENTITY MANAGEMENT

DummyDatabase.prototype.unit = function(unitId, callback) {
  callback({success: true, unit: null});
}

DummyDatabase.prototype.unitAt = function(gameId, x, y, callback) {
  callback({success: true, unit: null})
}

DummyDatabase.prototype.units = function(gameId, callback) {
  callback({success: true, units: []});
}

DummyDatabase.prototype.playerUnits = function(gameId, playerNumber, callback) {
  callback({success: true, units: []});
}

DummyDatabase.prototype.createUnit = function(gameId, newUnit, callback) {
  callback({success: true, unitId: 0});
}

DummyDatabase.prototype.updateUnit = function(unit, callback) {
  callback({success: true});
}

DummyDatabase.prototype.updateUnits = function(units, callback) {
  callback({success: true});
}

DummyDatabase.prototype.deleteUnit = function(unit, callback) {
  callback({success: true});
}

DummyDatabase.prototype.deleteUnits = function(units, callback) {
  callback({success: true});
}

DummyDatabase.prototype.tile = function(tileId, callback) {
  callback({success: true, tile: null});
}

DummyDatabase.prototype.tileAt = function(gameId, x, y, callback) {
  callback({success: true, tile: null})
}

DummyDatabase.prototype.tiles = function(gameId, callback) {
  callback({success: true, tiles: []});
}

DummyDatabase.prototype.playerTiles = function(gameId, playerNumber, callback) {
  callback({success: true, tiles: []});
}

DummyDatabase.prototype.updateTile = function(tile, callback) {
  callback({success: true});
}

DummyDatabase.prototype.updateTiles = function(tiles, callback) {
  callback({success: true});
}

// CHAT

DummyDatabase.prototype.createChatMessage = function(newChatMessage, callback) {
  callback({success: true, chatMessageId: 0});
}

DummyDatabase.prototype.chatMessages = function(gameId, callback) {
  callback({success: true, chatMessages: []});
}

// GAME EVENTS

DummyDatabase.prototype.createGameEvent = function(newGameEvent, callback) {
  callback({success: true});
}

DummyDatabase.prototype.createGameEvents = function(newGameEvents, callback) {
  callback({success: true});
}

DummyDatabase.prototype.gameEvents = function(gameId, callback) {
  callback({success: true, gameEvents: []});
}

// GAME STATISTICS

DummyDatabase.prototype.createGameStatistic = function(newGameStatistic, callback) {
  callback({success: true});
}

DummyDatabase.prototype.createGameStatistics = function(newGameStatistics, callback) {
  callback({success: true});
}

DummyDatabase.prototype.gameStatistics = function(gameId, callback) {
  callback({success: true, gameStatistics: []});
}

DummyDatabase.prototype.gameLatestStatistic = function(gameId, callback) {
  callback({success: true, latestStatistic: null});
}
