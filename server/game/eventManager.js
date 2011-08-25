var GameEvent = require("../entities/gameEvent").GameEvent;

function GameEventManager(gameId) {
  this.gameId = gameId;
  this.objects = [];
}

exports.GameEventManager = GameEventManager;
  
GameEventManager.prototype.createTickerMessage = function(content) {
  var time = (new Date()).getTime();
  var msg = new GameEvent(null, this.gameId, time, content);
  this.objects.push(msg);
};

function prepareUnit(unit) {
  return {unitId: unit.unitId, owner: unit.owner, type: unit.type};
};

function prepareTile(tile) {
  return {tileId: tile.tileId, owner: tile.owner, subtype: tile.subtype, type: tile.type};
};

function preparePlayer(player) {
  return player.playerNumber;
};

GameEventManager.prototype.attack = function(attacker, target, damage) {
  this.createTickerMessage({
    action: "attack",
    attacker: prepareUnit(attacker),
    target: prepareUnit(target),
    damage: damage
  });
};

GameEventManager.prototype.counterattack = function(attacker, target, damage) {
  this.createTickerMessage({
    action: "counterattack",
    attacker: prepareUnit(attacker),
    target: prepareUnit(target),
    damage: damage
  });
};

GameEventManager.prototype.capture = function(unit, tile, left) {
  this.createTickerMessage({
    action: "capture",
    unit: prepareUnit(unit),
    tile: prepareTile(tile),
    left: left
  });
};

GameEventManager.prototype.captured = function(unit, tile) {
  this.createTickerMessage({
    action: "captured",
    tile: prepareTile(tile),
    unit: prepareUnit(unit)
  });
};

GameEventManager.prototype.deploy = function(unit) {
  this.createTickerMessage({
    action: "deploy",
    unit: prepareUnit(unit)
  });
};

GameEventManager.prototype.undeploy = function(unit) {
  this.createTickerMessage({
    action: "undeploy",
    unit: prepareUnit(unit)
  });
};

GameEventManager.prototype.destroyed = function(unit) {
  this.createTickerMessage({
    action: "destroyed",
    unit: prepareUnit(unit)
  });
};

GameEventManager.prototype.repair = function(tile, unit, newHealth) {
  this.createTickerMessage({
    action: "repair",
    unit: prepareUnit(unit),
    tile: prepareTile(tile),
    newHealth: newHealth
  });
};

GameEventManager.prototype.build = function(tile, unit) {
  this.createTickerMessage({
    action: "build",
    unit: prepareUnit(unit),
    tile: prepareTile(tile)
  });
};

GameEventManager.prototype.regenerateCapturePoints = function(tile, newCapturePoints) {
  this.createTickerMessage({
    action: "regenerateCapturePoints",
    tile: prepareTile(tile),
    newCapturePoints: newCapturePoints
  });
};

GameEventManager.prototype.produceFunds = function(tile) {
  this.createTickerMessage({
    action: "produceFunds",
    tile: prepareTile(tile)
  });
};

GameEventManager.prototype.endTurn = function(player) {
  this.createTickerMessage({
    action: "endTurn",
    player: preparePlayer(player)
  });
};

GameEventManager.prototype.turnTimeout = function(player) {
  this.createTickerMessage({
    action: "turnTimeout",
    player: preparePlayer(player)
  });
};

GameEventManager.prototype.beginTurn = function(player) {
  this.createTickerMessage({
    action: "beginTurn",
    player: preparePlayer(player)
  });
};

GameEventManager.prototype.gameFinished = function(winner) {
  this.createTickerMessage({
    action: "finished",
    winner: preparePlayer(winner)
  });
};

GameEventManager.prototype.load = function(unit, carrier) {
  this.createTickerMessage({
    action: "load",
    unit: prepareUnit(unit),
    carrier: prepareUnit(carrier)
  });
};

GameEventManager.prototype.unload = function(unit, carrier) {
  this.createTickerMessage({
    action: "unload",
    unit: prepareUnit(unit),
    carrier: prepareUnit(carrier)
  });
};

GameEventManager.prototype.surrender = function(coward) {
  this.createTickerMessage({
    action: "surrender",
    player: preparePlayer(coward)
  });
}
