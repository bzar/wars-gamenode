define(["Theme", "lib/sylvester"], function(Theme, sylvester) {
  function Map(canvas, scale, theme) {
    this.theme = theme ? theme : new Theme("pixel");
    this.autoscale = !scale;
    this.scale = scale;
    this.canvas = canvas;
    this.xAxis = $V([this.theme.settings.hex.width - this.theme.settings.hex.triWidth, this.theme.settings.hex.height / 2]);
    this.yAxis = $V([0, this.theme.settings.hex.height]);
    this.origin = $V([0, this.theme.settings.image.height - this.theme.settings.hex.height]);
    this.tiles = null;
    this.sprites = null;
  }
  
  
  Map.prototype.hex2rectCoords = function(hx, hy) {
    var p = hy !== undefined ? $V([hx, hy]) : hx;
    p = this.xAxis.multiply(p.e(1)).add(this.yAxis.multiply(p.e(2)));
    p = p.add(this.origin);
    return p;
  }

  Map.prototype.rect2hexCoords = function(rx, ry) {
    var p = ry !== undefined ? $V([rx, ry]) : rx;
    p = p.subtract(this.origin);
    
    var origin = $M([
      [1, 0, -this.theme.settings.hex.width/2],
      [0, 1, -this.theme.settings.hex.height/2],
      [0, 0, 1]
    ]);
    var mat = $M([
      [this.xAxis.e(1), this.yAxis.e(1), 0],
      [this.xAxis.e(2), this.yAxis.e(2), 0],
      [0,                  0,                  1]
    ]).inv();
    
    return mat.multiply(origin.multiply($V([p.e(1), p.e(2), 1]))).round();
  }
  
  Map.prototype.getScale = function() {
    if(this.autoscale) {
      var mapSize = this.getMapDimensions();
      var horScale = this.canvas.width / mapSize.e(1);
      var verScale = this.canvas.height / mapSize.e(2);
      this.scale = horScale < verScale ? horScale : verScale;
    }
    return this.scale;
  };
  
  Map.prototype.getOffset = function() {
    if(this.autoscale) {
      var mapSize = this.getMapDimensions();
      var xOffset = mapSize.w < mapSize.h ? (mapSize.h - mapSize.w) / 2: 0;
      var yOffset = mapSize.w > mapSize.h ? (mapSize.w - mapSize.h) / 2: 0;
      return $V([xOffset, yOffset]);
    } else {
      return $V([0, 0]);
    }
  };

  Map.prototype.doPreload = function(callback) {
      this.sprites = new Image();
      this.sprites.src = this.theme.getSpriteSheetUrl();
      this.sprites.onload = callback;
  };

  Map.prototype.getMapLimits = function() {
    var min = null;
    var max = null;
    
    this.tiles.forEach(function(tile){
      if(min === null) {
        min = $V([tile.x, tile.y]);
        max = $V([tile.x, tile.y]);
      } else {
        min = $V([tile.x < min.e(1) ? tile.x : min.e(1), 
                 tile.y < min.e(2) ? tile.y : min.e(2)]);
        max = $V([tile.x > max.e(1) ? tile.x : max.e(1), 
                 tile.y > max.e(2) ? tile.y : max.e(2)]);
      }
    });
    
    return {min: min, max: max};
  };
  
  Map.prototype.getMapSize = function() {
    var size = this.getMapLimits();
    return size.max.subtract(size.min);    
  }
  
  Map.prototype.getMapDimensions = function() {
    var size = this.getMapLimits().max;
    var w = this.hex2rectCoords(size.e(1) + 1, 0).e(1);
    var h = this.hex2rectCoords(0, size.e(2) + 1).e(2);
    var rectSize = $V([w, h]).add($V([this.theme.settings.hex.triWidth + this.origin.e(1), this.origin.e(2)]));
    return rectSize;
  };

  Map.prototype.getTile = function(x, y) {
    if(x !== undefined && y !== undefined) {
      return this.tiles.filter(function(d) {
          if(d.x == x && d.y == y) return true;
      })[0];
    } else if(x !== undefined) {
      var tiles = this.tiles.filter(function(tile){
        return tile.tileId == x;
      });
      return tiles.length != 0 ? tiles[0] : null;
    } else {
      return null;
    }
  };

  Map.prototype.clear = function() {
      var ctx = this.canvas.getContext("2d");
      var rect = this.getMapDimensions().multiply(this.getScale());
      ctx.clearRect(0, 0, rect.e(1), rect.e(2));
  };

  Map.prototype._drawHex = function(ctx, tileType, tileSubtype, tileOwner, x, y) {
    var imageCoords = this.theme.getTileCoordinates(tileType, tileSubtype, tileOwner);
    ctx.drawImage(this.sprites, imageCoords.x, imageCoords.y, 
                  this.theme.settings.image.width, this.theme.settings.image.height,
                  x, y, this.theme.settings.image.width, this.theme.settings.image.height);
  }


  Map.prototype._drawProp = function(ctx, tileType, tileSubtype, tileOwner, x, y) {
    var imageCoords = this.theme.getTilePropCoordinates(tileType, tileSubtype, tileOwner);
    
    if(imageCoords === null)
      return;
    
    ctx.drawImage(this.sprites, imageCoords.x, imageCoords.y, 
                  this.theme.settings.image.width, this.theme.settings.image.height,
                  x, y, this.theme.settings.image.width, this.theme.settings.image.height);
  }

  Map.prototype._drawPropOnHex = function(ctx, tileType, tileSubtype, tileOwner, x, y) {
    this._drawProp(ctx, tileType, tileSubtype, tileOwner, 
              x, y - (this.theme.settings.image.height - this.theme.settings.hex.height), 
              this.theme.settings.image.width, this.theme.settings.image.height);
  }


  Map.prototype._drawUnit = function(ctx, unitType, unitOwner, x, y) {
    var imageCoords = this.theme.getUnitCoordinates(unitType, unitOwner);
    ctx.drawImage(this.sprites, imageCoords.x, imageCoords.y, 
                  this.theme.settings.image.width, this.theme.settings.image.height,
                  x, y, this.theme.settings.image.width, this.theme.settings.image.height);
  }

  Map.prototype._drawUnitOnHex = function(ctx, unitType, unitOwner, x, y) {
    this._drawUnit(ctx, unitType, unitOwner, x, y - (this.theme.settings.image.height - this.theme.settings.hex.height), 
             this.theme.settings.image.width, this.theme.settings.image.height);
  }

  Map.prototype._redraw = function(ctx) {
    for(var i = 0; i < this.tiles.length; ++i) {
      var tile = this.tiles[i];
      if(tile) {
        var r = this.hex2rectCoords(tile.x, tile.y);
        var offset = this.theme.getTileOffset(tile.type, tile.subtype, tile.owner);
        
        this._drawHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset);
        this._drawPropOnHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset);
        
        if(tile.unit)
          this._drawUnitOnHex(ctx, tile.unit.type, tile.unit.owner, r.e(1), r.e(2) + offset);
      }
    }
  }

  Map.prototype.sortTilesToRenderOrder = function() {
    this.tiles.sort(function(a, b){ 
      if(a.y !== b.y) {
        return a.y - b.y;
      } else {
        return a.x - b.x;
      }
    });
  };
  
  Map.prototype.refresh = function() {
    this.sortTilesToRenderOrder();
  
    this.clear();

    if(!this.autoscale) {
        var mapSize = this.getMapDimensions();
        this.canvas.width = mapSize.e(1);
        this.canvas.height = mapSize.e(2);
    }

    var ctx = this.canvas.getContext("2d");
    
    ctx.save();
    
    var offset = this.getOffset();
    ctx.translate(offset.e(1), offset.e(2));
    
    var scale = this.getScale();
    ctx.scale(scale, scale);
    
    this._redraw(ctx, this.tiles);
    
    ctx.restore();
  };

  Map.prototype.eventToTile = function(event) {
      var cx = event.pageX - $(this.canvas).offset().left;
      var cy = event.pageY - $(this.canvas).offset().top;
      var offset = this.getOffset();
      var scale = this.getScale();
      return this.rect2hexCoords((cx - offset.e(1)) / scale, (cy - offset.e(2)) / scale);
  };
  
  Map.prototype.eventToTileX = function(event) {
      return this.eventToTile(event).e(1);
  };
  
  Map.prototype.eventToTileY = function(event) {
      return this.eventToTile(event).e(2);
  };

  Map.prototype.tileWithUnit = function(unitId) {
    var tiles = this.tiles.filter(function(tile){
      return tile.unit !== null && tile.unit.unitId == unitId;
    });
    
    return tiles.length != 0 ? tiles[0] : null;
  }
  
  return Map;
});