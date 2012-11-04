var settings = require("../settings").settings;

function Unit(unitId, tileId, type, owner, carriedBy, health, deployed, moved, capturing) {
  this.unitId = unitId;
  this.tileId = tileId;
  this.type = type;
  this.owner = owner;
  this.carriedBy = carriedBy;
  this.health = health;
  this.deployed = deployed;
  this.moved = moved;
  this.capturing = capturing;
  this.carriedUnits = [];
};

exports.Unit = Unit;

Unit.prototype.clone = function() {
  var u = new Unit();
  u.unitId = this.unitId;
  u.tileId = this.tileId;
  u.type = this.type;
  u.owner = this.owner;
  u.carriedBy = this.carriedBy;
  u.health = this.health;
  u.deployed = this.deployed;
  u.moved = this.moved;
  u.capturing = this.capturing;
  return u;
}

Unit.prototype.cloneFrom = function(other) {
  this.unitId = other.unitId;
  this.tileId = other.tileId;
  this.type = other.type;
  this.owner = other.owner;
  this.carriedBy = other.carriedBy;
  this.health = other.health;
  this.deployed = other.deployed;
  this.moved = other.moved;
  this.capturing = other.capturing;
  return this;
}

Unit.prototype.wait = function() {
  this.moved = true;
  this.capturing = false;
}

Unit.prototype.reset = function() {
  this.moved = false;
}

Unit.prototype.unitType = function() {
  return settings.gameElements.units[this.type];
}

Unit.prototype.heal = function(amount) {
  var oldHealth = this.health;
  this.health += amount;
  if(this.health > 100) {
    this.health = 100;
  }
  return this.health - oldHealth;
}

Unit.prototype.capture = function(tile) {
  var wasCaptured = false;
  tile.capturePoints -= this.health;
  if(tile.capturePoints > 0) {
    tile.beingCaptured = true;
    this.capturing = true;
  } else {
    tile.owner = this.owner;
    tile.capturePoints = 1;
    tile.beingCaptured = false;
    this.capturing = false;
    wasCaptured = true;
  }
  this.moved = true;
  return wasCaptured;
}

Unit.prototype.deploy = function(amount) {
  this.deployed = true;
  this.moved = true;
  this.capturing = false;
}

Unit.prototype.undeploy = function(amount) {
  this.deployed = false;
  this.moved = true;
  this.capturing = false;
}

Unit.prototype.loadInto = function(unit) {
  this.carriedBy = unit.unitId;
  this.tileId = null;
  if(unit.carriedUnits === undefined)
    unit.carriedUnits = [];
  unit.carriedUnits.push(this);
  this.moved = true;
  this.capturing = false;
}

Unit.prototype.unloadFrom = function(unit) {
  this.carriedBy = null;
  this.tileId = null;
  for(var i = 0; i < unit.carriedUnits.length; ++i) {
    if(unit.carriedUnits[i].unitId == this.unitId) {
      unit.carriedUnits.splice(i, 1);
      break;
    }
  }
  this.moved = true;
}



