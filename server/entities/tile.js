function Tile(tileId, gameId, x, y, type, subType, ownerId, unitId, capturePoints, beingCaptured) {
  this.tileId = tileId;
  this.gameId = gameId;
  this.x = x;
  this.y = y;
  this.type = type;
  this.subType = subType;
  this.ownerId = ownerId;
  this.unitId = unitId;
  this.capturePoints = capturePoints;
  this.beingCaptured = beingCaptured;
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