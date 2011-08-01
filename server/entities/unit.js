function Unit() {
  this.unitId = null;
  this.tileId = null;
  this.type = null;
  this.ownerId = null;
  this.carriedBy = null;
  this.health = null;
  this.deployed = null;
  this.moved = null;
  this.capturing = null;
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