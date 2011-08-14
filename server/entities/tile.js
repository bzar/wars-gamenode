var settings = require("../settings").settings;

function Tile(tileId, gameId, x, y, type, subtype, owner, unitId, capturePoints, beingCaptured) {
  this.tileId = tileId;
  this.gameId = gameId;
  this.x = x;
  this.y = y;
  this.type = type;
  this.subtype = subtype;
  this.owner = owner;
  this.unitId = unitId;
  this.capturePoints = capturePoints;
  this.beingCaptured = beingCaptured;
};

exports.Tile = Tile;

Tile.prototype.clone = function() {
  var t = new Tile();
  t.tileId = this.tileId;
  t.gameId = this.gameId;
  t.type = this.type;
  t.subtype = this.subtype;
  t.x = this.x;
  t.y = this.y;
  t.owner = this.owner;
  t.unitId = this.unitId;
  t.capturePoints = this.capturePoints;
  t.beingCaptured = this.beingCaptured;
  return t;
}

Tile.prototype.cloneFrom = function(other) {
  this.tileId = other.tileId;
  this.gameId = other.gameId;
  this.x = other.x;
  this.y = other.y;
  this.type = other.type;
  this.subtype = other.subtype;
  this.owner = other.owner;
  this.unitId = other.unitId;
  this.capturePoints = other.capturePoints;
  this.beingCaptured = other.beingCaptured;
  return this;
}

Tile.prototype.terrainType = function() {
  return settings.gameElements.terrains[this.type];
}

Tile.prototype.setUnit = function(unit) {
  if(unit === null) {
    this.unitId = null;
    this.unit = null;
  } else {
    this.unitId = unit.unitId;
    this.unit = unit;
    unit.tileId = this.tileId;
  }
}
