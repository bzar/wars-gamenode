function Unit(unitId, tileId, type, ownerId, carriedBy, health, deployed, moved, capturing) {
  this.unitId = unitId;
  this.tileId = tileId;
  this.type = type;
  this.ownerId = ownerId;
  this.carriedBy = carriedBy;
  this.health = health;
  this.deployed = deployed;
  this.moved = moved;
  this.capturing = capturing;
};

exports.Unit = Unit;

Unit.prototype.clone = function() {
  var u = new Unit();
  u.unitId = this.unitId;
  u.tileId = this.tileId;
  u.type = this.type;
  u.ownerId = this.ownerId;
  u.carriedBy = this.carriedBy;
  u.health = this.health;
  u.deployed = this.deployed;
  u.moved = this.moved;
  u.capturing = this.capturing;
}