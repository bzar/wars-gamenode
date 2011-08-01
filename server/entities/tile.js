function Tile() {
  this.tileId = null;
  this.gameId = null;
  this.type = null;
  this.subType = null;
  this.x = null;
  this.y = null;
  this.ownerId = null;
  this.unitId = null;
  this.capturePoints = null;
  this.beingCaptured = null;
};

Tile.prototype.clone = function() {
  var t = new Tile();
  t.tileId = this.tileId;
  t.gameId = this.gameId;
  t.type = this.type;
  t.subType = this.subType;
  t.x = this.x;
  t.y = this.y;
  t.ownerId = this.ownerId;
  t.unitId = this.unitId;
  t.capturePoints = this.capturePoints;
  t.beingCaptured = this.beingCaptured;
  return t;
}

exports.Tile = Tile;