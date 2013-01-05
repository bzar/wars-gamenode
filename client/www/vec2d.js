function Vec2D(x, y) {
  this.x = x;
  this.y = y;
}

Vec2D.prototype.add = function(other) {
  return new Vec2D(this.x + other.x, this.y + other.y);
}

Vec2D.prototype.neg = function() {
  return new Vec2D(-this.x, -this.y);
}

Vec2D.prototype.negi = function() {
  this.x = -this.x;
  this.y = -this.y;
  return this;
}


Vec2D.prototype.addi = function(other) {
    this.x += other.x;
    this.y += other.y;
    return this;
}

Vec2D.prototype.copy = function(other) {
  return new Vec2D(this.x, this.y);
}

Vec2D.prototype.scale = function(multiplier) {
  return new Vec2D(this.x * multiplier, this.y * multiplier);
}

Vec2D.prototype.scalei = function(multiplier) {
  this.x *= multiplier;
  this.y *= multiplier;
  return this;
}

Vec2D.prototype.unit = function() {
  if(this.x == 0 && this.y == 0)
    return new Vec2D(0,0);
      
  var l = this.length();
  return new Vec2D(this.x / l, this.y / l);
}

Vec2D.prototype.uniti = function() {
  if(this.x == 0 && this.y == 0) {
    return this;
  }
  var l = this.length();
  this.x = this.x / l;
  this.y = this.y / l;
  return this;
}

Vec2D.prototype.length = function() {
  return Math.sqrt(this.lengthSquared());
}

Vec2D.prototype.lengthSquared = function() {
  return this.x * this.x + this.y * this.y;
}

Vec2D.prototype.dotProduct = function(other) {
  return this.x * other.x + this.y * other.y;
}

Vec2D.prototype.crossProduct = function(other) {
  return this.x * other.y - this.y * other.x;
}

Vec2D.prototype.subtract = function(other) {
  return new Vec2D(this.x - other.x, this.y - other.y);
}

Vec2D.prototype.subtracti = function(other) {
  this.x -= other.x;
  this.y -= other.y;
  return this;
}

Vec2D.prototype.equals = function(other) {
  return this.x == other.x && this.y == other.y;
}

Vec2D.prototype.projection = function(other) {
  var direction = other.unit();
  var projection = direction.scalei(this.dotProduct(direction))
  return projection;
}

Vec2D.prototype.projectioni = function(other) {
  var direction = other.unit();
  var projection = direction.scalei(this.dotProduct(direction))
  this.x = projection.x;
  this.y = projection.y;
  return this;
}


Vec2D.prototype.normal = function() {
  return new Vec2D(this.y, -this.x);
}

Vec2D.prototype.normali = function() {
  var tmp = this.x;
  this.x = this.y;
  this.y = -tmp;
  return this;
}

Vec2D.prototype.toString = function() {
  return "(" + this.x + ", " + this.y + ")";
}

Vec2D.prototype.assign = function(other) {
  this.x = other.x;
  this.y = other.y;
  return this;
}

Vec2D.prototype.toLine = function(a, b) {
  return a.subtract(this).projectioni(b.subtract(a).normali());
}

Vec2D.prototype.toLineSegment = function(a, b) {
  var normal = b.subtract(a).normali();
  if(normal.crossProduct(this.subtract(a)) < 0) {
    return a.subtract(this);
  } else if(normal.crossProduct(this.subtract(b)) > 0) {
    return b.subtract(this);
  } else {
    return a.subtract(this).projectioni(normal);
  }
}

