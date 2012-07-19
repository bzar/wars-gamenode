define(["Theme", "aja/lib/aja", "pixastic", "sylvester"], function(Theme) {
  function AnimatedMap(canvasId, scale, theme, rules) {
    this.theme = theme ? theme : new Theme("pixel");
    this.autoscale = !scale;
    this.scale = scale;
    this.canvas = new aja.Canvas(canvasId);
    
    this.overlay = new Overlay(this);
    this.overlay.z = 100;
    this.canvas.addEntity(this.overlay);
    this.overlay.visible = false;
    
    this.animationSpeed = 1.0;
    this.animate = true;
    
    this.canvas.renderOrder = function(a, b) {
      if(a.z === undefined) {
        if(b.z === undefined) {
          return (a.y + a.x/2) - (b.y + b.x/2);
        } else {
          return -b.z;
        }
      } else {
        if(b.z === undefined) {
          return a.z;
        } else {
          return a.z - b.z;
        }
      }
    }
    
    this.xAxis = $V([this.theme.settings.hex.width - this.theme.settings.hex.triWidth, this.theme.settings.hex.height / 2]);
    this.yAxis = $V([0, this.theme.settings.hex.height]);

    this.tiles = null;
    this.sprites = null;
    this.rules = rules;
    
    this.powerMap = null;
    this.showPowerMap = false;
    this.showBorders = false;
    this.showGrid = false;

    this.unitEntities = {};
  }

  AnimatedMap.prototype.hex2rectCoords = function(hx, hy) {
    if(hy === undefined) {
      return this.xAxis.multiply(hx.e(1)).add(this.yAxis.multiply(hx.e(2)));
    } else {
      return this.xAxis.multiply(hx).add(this.yAxis.multiply(hy));
    }
  }

  AnimatedMap.prototype.rect2hexCoords = function(rx, ry) {
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
    
    if(ry === undefined) {
      return mat.multiply(origin.multiply($V([rx.e(1), rx.e(2), 1]))).round();
    } else {
      return mat.multiply(origin.multiply($V([rx, ry, 1]))).round();
    }
  }
  
  AnimatedMap.prototype.getScale = function() {
    if(this.autoscale) {
      var mapSize = this.getMapDimensions();
      var horScale = this.canvas.width / mapSize.e(1);
      var verScale = this.canvas.height / mapSize.e(2);
      this.scale = horScale < verScale ? horScale : verScale;
    }
    return this.scale;
  };
  
  AnimatedMap.prototype.getOffset = function() {
    if(this.autoscale) {
      var mapSize = this.getMapDimensions();
      var xOffset = mapSize.w < mapSize.h ? (mapSize.h - mapSize.w) / 2: 0;
      var yOffset = mapSize.w > mapSize.h ? (mapSize.w - mapSize.h) / 2: 0;
      return $V([xOffset, yOffset]);
    } else {
      return $V([0, 0]);
    }
  };

  
  AnimatedMap.prototype.doPreload = function(callback) {
      this.sprites = new Image();
      this.spritesMoved = new Image();
      this.spritesAttack = new Image();
      
      var sprites = this.sprites;
      var spritesMoved = this.spritesMoved;
      var spritesAttack = this.spritesAttack;
      
      this.sprites.src = this.theme.getSpriteSheetUrl();
      var that = this ;
      sprites.onload = function() {
        spritesMoved.src = sprites.src;
        spritesMoved.onload = function() {
          Pixastic.process(spritesMoved, "hsl", {hue:0,saturation:-30,lightness:-30}, function(img) {
            that.spritesMoved = img;
            
            spritesAttack.src = sprites.src;
            spritesAttack.onload = function() {
              Pixastic.process(spritesAttack, "coloradjust", {red:1.0,green:-0.2,blue:-0.2}, function(img) {
                that.spritesAttack = img;
                callback();
              });
            }
          });
        }
      }
  };

  AnimatedMap.prototype.getMapLimits = function() {
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
  
  AnimatedMap.prototype.getMapSize = function() {
    var size = this.getMapLimits();
    return size.max.subtract(size.min);    
  }
  
  AnimatedMap.prototype.getMapDimensions = function() {
    var size = this.getMapLimits().max;
    var w = this.hex2rectCoords(size.e(1) + 1, 0).e(1);
    var h = this.hex2rectCoords(0, size.e(2) + 2).e(2);
    var rectSize = $V([w, h]).add($V([this.theme.settings.hex.triWidth, this.theme.settings.image.height - this.theme.settings.hex.height - this.theme.settings.hex.thickness]));
    return rectSize;
  };

  AnimatedMap.prototype.getTile = function(x, y) {
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

  AnimatedMap.prototype.clear = function() {
    this.canvas.ctx.clearRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);
  };

  AnimatedMap.prototype._drawHex = function(ctx, tileType, tileSubtype, tileOwner, x, y, sheet) {
    var imageCoords = this.theme.getTileCoordinates(tileType, tileSubtype, tileOwner);
    ctx.drawImage(sheet ? sheet : this.sprites, imageCoords.x, imageCoords.y, 
                  this.theme.settings.image.width, this.theme.settings.image.height,
                  x, y, this.theme.settings.image.width, this.theme.settings.image.height);
  }


  AnimatedMap.prototype._drawProp = function(ctx, tileType, tileSubtype, tileOwner, x, y, sheet) {
    var imageCoords = this.theme.getTilePropCoordinates(tileType, tileSubtype, tileOwner);
    
    if(imageCoords === null)
      return;

    ctx.drawImage(sheet ? sheet : this.sprites, imageCoords.x, imageCoords.y, 
                  this.theme.settings.image.width, this.theme.settings.image.height,
                  x, y, this.theme.settings.image.width, this.theme.settings.image.height);
  }

  AnimatedMap.prototype._drawPropOnHex = function(ctx, tileType, tileSubtype, tileOwner, x, y, sheet) {
    this._drawProp(ctx, tileType, tileSubtype, tileOwner, 
              x, y - (this.theme.settings.image.height - this.theme.settings.hex.height), sheet);
  }


  AnimatedMap.prototype._redrawTerrain = function(ctx, redrawFunc) {
    for(var i = 0; i < this.tiles.length; ++i) {
      var tile = this.tiles[i];
      if(tile) {
        var r = this.hex2rectCoords(tile.x, tile.y);
        var offset = this.theme.getTileOffset(tile.type, tile.subtype, tile.owner);
        
        if(redrawFunc) {
          redrawFunc(ctx, tile, r, offset);
        } else {
          this._drawHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset);
          this._drawPropOnHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset);
        }
      }
    }
  }

  AnimatedMap.prototype.paintMovementMask = function(movementOptions) {
    var ctx = this.canvas.background.getContext("2d");
    var that = this;
    this._redrawTerrain(ctx, function(ctx, tile, r, offset) {
      var sheet = that.spritesMoved;
      for(var i = 0; i < movementOptions.length; ++i) {
        if(movementOptions[i].pos.x == tile.x && movementOptions[i].pos.y == tile.y) {
          sheet = null;
          break;
        }
      }
      that._drawHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet);
      that._drawPropOnHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet);
    });
    
    this.canvas.forceRedraw();
  }
  
  AnimatedMap.prototype.paintUnloadMask = function(unloadOptions) {
    var ctx = this.canvas.background.getContext("2d");
    var that = this;
    this._redrawTerrain(ctx, function(ctx, tile, r, offset) {
      var sheet = that.spritesMoved;
      for(var i = 0; i < unloadOptions.length; ++i) {
        if(unloadOptions[i].x == tile.x && unloadOptions[i].y == tile.y) {
          sheet = null;
          break;
        }
      }
      that._drawHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet);
      that._drawPropOnHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet);
    });
    
    this.canvas.forceRedraw();
  }
  
  AnimatedMap.prototype.paintAttackMask = function(attackOptions) {
    var ctx = this.canvas.background.getContext("2d");
    var that = this;
    this._redrawTerrain(ctx, function(ctx, tile, r, offset) {
      var sheet = null;
      for(var i = 0; i < attackOptions.length; ++i) {
        if(attackOptions[i].pos.x == tile.x && attackOptions[i].pos.y == tile.y) {
          sheet = that.spritesAttack;
          break;
        }
      }
      that._drawHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet);
      that._drawPropOnHex(ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet);
    });
    
    var octx = this.overlay.canvas.getContext("2d");
    octx.clearRect(0, 0, octx.canvas.width, octx.canvas.height);
    
    for(var o = 0; o < attackOptions.length; ++o) {
      var opt = attackOptions[o];
      var damageString = "" + opt.power;
      var coord = this.hex2rectCoords(opt.pos.x, opt.pos.y);
      
      for(var i = 0; i < damageString.length; ++i) {
        var n = damageString[i];
        var numCoord = this.theme.getDamageNumberCoordinates(n);
        octx.drawImage(this.sprites,
                       numCoord.x, numCoord.y, this.theme.settings.image.width, this.theme.settings.image.height,
                       coord.e(1) - ((damageString.length - 1)/2 - i) * (this.theme.settings.number.width + 1), 
                       coord.e(2) - (this.theme.settings.image.height - this.theme.settings.hex.height), 
                       this.theme.settings.image.width, this.theme.settings.image.height);
      }

    }
    
    this.overlay.visible = true;
    
    this.canvas.forceRedraw();
  }
  
  AnimatedMap.prototype.sortTilesToRenderOrder = function() {
    this.tiles.sort(function(a, b){ 
      if(a.y !== b.y) {
        return a.y - b.y;
      } else {
        return a.x - b.x;
      }
    });
  };
  
  AnimatedMap.prototype.refresh = function() {
    this.sortTilesToRenderOrder();
  
    this.clear();

    if(!this.autoscale) {
        var mapSize = this.getMapDimensions();
        this.canvas.width = mapSize.e(1);
        this.canvas.height = mapSize.e(2);
    }

    var ctx = this.canvas.background.getContext("2d");
    
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);

    this._redrawTerrain(ctx);

    if(this.powerMap != null) {
      if(this.showPowerMap) {
        this.paintPowerMap(this.powerMap);
      }
      if(this.showBorders) {
        this.paintBorders(this.powerMap);
      }
    }

    if(this.showGrid) {
        this.paintGrid();
    }

    this.canvas.forceRedraw();
  };

  AnimatedMap.prototype.coordToTile = function(cx, cy) {
    var offset = this.getOffset();
    var scale = this.getScale();
    return this.rect2hexCoords((cx - offset.e(1)) / scale, (cy - offset.e(2)) / scale);    
  }
  
  AnimatedMap.prototype.hideOverlay = function() {
    this.overlay.visible = false;
    this.canvas.forceRedraw();
  }
  
  AnimatedMap.prototype.eventToTile = function(event) {
      var cx = event.pageX - $(this.canvas).offset().left;
      var cy = event.pageY - $(this.canvas).offset().top;
      return coordToTile(cx, cy);
  };
  
  AnimatedMap.prototype.eventToTileX = function(event) {
      return this.eventToTile(event).e(1);
  };
  
  AnimatedMap.prototype.eventToTileY = function(event) {
      return this.eventToTile(event).e(2);
  };

  AnimatedMap.prototype.capturedPercentage = function(el) {
      return el.capturePoints / 200;
  };

  AnimatedMap.prototype.resize = function(width, height) {
    this.canvas.resize(width, height);
    this.overlay.resize(width, height);
  };
  

  AnimatedMap.prototype.paintDamageIndicators = function(attacks) {
      var mapSize = this.getMapSize();
      var ctx = this.overlay.canvas.getContext("2d");
      
      ctx.scale(this.getScale(), this.getScale());

      for (i in attacks) {
          var power = attacks[i].power;
          ctx.fillStyle    = '#fff';
          ctx.strokeStyle  = '#555';
          ctx.lineWidth    = 1;
          ctx.font         = '15px sans-serif';
          ctx.textBaseline = 'top';
          ctx.strokeText(power + '%', attacks[i].pos.x*this.tileW+2, attacks[i].pos.y*this.tileH+2 - this.unitOffsetY);
          ctx.fillText(power + '%', attacks[i].pos.x*this.tileW+2, attacks[i].pos.y*this.tileH+2 - this.unitOffsetY);
      }
      this.canvas.forceRedraw();
  };


  AnimatedMap.prototype.tileWithUnit = function(unitId) {
    var tiles = this.tiles.filter(function(tile){
      return tile.unit !== null && tile.unit.unitId == unitId;
    });
    
    return tiles.length != 0 ? tiles[0] : null;
  }

  AnimatedMap.prototype.getMapArray = function() {
    var mapArray = {};
    this.tiles.forEach(function(tile){
      if(mapArray[tile.y] === undefined) {
        mapArray[tile.y] = {};
      }
      
      mapArray[tile.y][tile.x] = tile;
    });

    return mapArray;
  };

  AnimatedMap.prototype.interpolateColor = function(baseColor, targetColor, scalar) {
      var color = {
        r: baseColor.r + scalar * (targetColor.r - baseColor.r),
        g: baseColor.g + scalar * (targetColor.g - baseColor.g),
        b: baseColor.b + scalar * (targetColor.b - baseColor.b)
      };
      return color;
  };

  AnimatedMap.prototype.paintPowerMap = function(powerMap) {
      var ctx = this.canvas.background.getContext("2d");
      ctx.save();
      ctx.globalAlpha = 0.8;
      var neutralColor = this.theme.getPlayerColor(0);
      for(y in powerMap.tiles) {
          for(x in powerMap.tiles[y]) {
              y = parseInt(y);
              x = parseInt(x);
              var maxValuePlayer = powerMap.tiles[y][x].maxValuePlayer;
              var playerColor = this.theme.getPlayerColor(maxValuePlayer);
              var valueScale = (parseFloat(powerMap.tiles[y][x].maxValue) / parseFloat(powerMap.maxValue))/2 + 0.5;
              var color = this.interpolateColor(neutralColor, playerColor, valueScale);
              ctx.fillStyle = "rgba(" + parseInt(color.r) + "," + parseInt(color.g) + "," + parseInt(color.b) + "," + valueScale + ")";
              this.paintMask(ctx, x, y);
          }
      }
      ctx.restore();
      this.canvas.forceRedraw();
  };

  AnimatedMap.prototype.paintBorders = function(powerMap) {
      var ctx = this.canvas.background.getContext("2d");
      ctx.save();
      ctx.globalAlpha = 1.0;
      for(y in powerMap.tiles) {
          for(x in powerMap.tiles[y]) {
              y = parseInt(y);
              x = parseInt(x);
              var maxValuePlayer = powerMap.tiles[y][x].maxValuePlayer;
              if(maxValuePlayer == 0) {
                  continue;
              }

              var x1 = x*this.tileW;
              var y1 = y*this.tileH - this.unitOffsetY;
              var x2 = (x+1)*this.tileW;
              var y2 = (y+1)*this.tileH - this.unitOffsetY;

              var color = this.theme.getPlayerColorString(maxValuePlayer);
              ctx.strokeStyle = color;
              ctx.lineWidth = 3;
              ctx.beginPath();

              if(y > 0 && maxValuePlayer != powerMap.tiles[y-1][x].maxValuePlayer) {
                  ctx.moveTo(x1, y1+1);
                  ctx.lineTo(x2, y1+1);
              }
              if(x > 0 && maxValuePlayer != powerMap.tiles[y][x-1].maxValuePlayer) {
                  ctx.moveTo(x1+1, y1);
                  ctx.lineTo(x1+1, y2);
              }
              if(y < powerMap.tiles.length - 1 && maxValuePlayer != powerMap.tiles[y+1][x].maxValuePlayer) {
                  ctx.moveTo(x1, y2-1);
                  ctx.lineTo(x2, y2-1);
              }
              if(x < powerMap.tiles[y].length - 1 && maxValuePlayer != powerMap.tiles[y][x+1].maxValuePlayer) {
                  ctx.moveTo(x2-1, y1);
                  ctx.lineTo(x2-1, y2);
              }

              ctx.stroke();
              ctx.closePath();

          }
      }
      ctx.restore();
      this.canvas.forceRedraw();
  };

  AnimatedMap.prototype.paintGrid = function() {
      var ctx = this.canvas.background.getContext("2d");
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      var mapSize = this.getMapSize();

      for(var y = 0; y < mapSize.h - 1; ++y) {
          ctx.moveTo(0, (y+1) * this.tileH - this.unitOffsetY);
          ctx.lineTo(mapSize.w * this.tileW, (y+1) * this.tileH - this.unitOffsetY);
      }

      for(var x = 0; x < mapSize.w - 1; ++x) {
          ctx.moveTo((x+1) * this.tileW, -this.unitOffsetY);
          ctx.lineTo((x+1) * this.tileW, mapSize.h * this.tileH - this.unitOffsetY);
      }

      ctx.stroke();
      ctx.restore();
      this.canvas.forceRedraw();
  };

  AnimatedMap.prototype.initEntities = function() {
    var that = this;
    this.tiles.forEach(function(el){
      if(el.unit) {
        var unit = new MapUnit(el.unit, el.x, el.y, that);
        unit.healthIndicator = new HealthIndicator(unit);
        that.canvas.addEntity(unit);
        that.canvas.addEntity(unit.healthIndicator);
      }
      
      if(el.capturePoints < 200) {
        el.captureBar = new CaptureBar(el, that);
        that.canvas.addEntity(el.captureBar);
      }
    });
    
    this.canvas.forceRedraw();
  }

  AnimatedMap.prototype.getUnitEntity = function(unitId) {
    for(var i = 0; i < this.canvas.entities.length; ++i) {
      var u = this.canvas.entities[i];
      if(u.unitId === unitId) {
        return u;
      }
    }
    
    return null;
  }

  AnimatedMap.prototype.showMoveUnit = function(unitId, path, callback) {
    var u = this.getUnitEntity(unitId);
    var endPos = u.hexPos(path[path.length - 1].x, path[path.length - 1].y);
    if(path.length > 1 && this.animate && (u.x != endPos.e(1) || u.y != endPos.e(2))) {
      var pathSegments = [];
      var segmentTime = 1000  / (this.animationSpeed * path.length);
      for(var i = 1; i < path.length; ++i) {
        var prev = path[i - 1];
        var next = path[i];
        var prevPos = u.hexPos(prev.x, prev.y);
        var nextPos = u.hexPos(next.x, next.y);
        pathSegments.push(new aja.PositionAnimation(u, prevPos.e(1), prevPos.e(2), nextPos.e(1), nextPos.e(2), segmentTime));
      }
      this.canvas.addAnimation(new aja.SequentialAnimation(pathSegments, callback));
    } else {
      u.x = endPos.e(1);
      u.y = endPos.e(2);
      this.canvas.redrawEntity(u);
      
      if(callback !== undefined)
        callback();
    }
  }
  
  AnimatedMap.prototype.moveUnit = function(unitId, tileId, path, callback) {    
    var that = this;
    this.showMoveUnit(unitId, path, function() {
      var u = that.getUnitEntity(unitId);
      var prevTile = that.getTile(u.tx, u.ty);
      var t = that.getTile(tileId);
      
      prevTile.unit = null;
      if(t.unit === null)
        t.unit = u.unit;
      
      that.canvas.eraseEntity(u);
      u.tx = t.x;
      u.ty = t.y;
      var pos = u.hexPos(t.x, t.y);
      u.x = pos.e(1);
      u.y = pos.e(2);
      that.canvas.drawEntity(u);
      
      if(callback !== undefined) 
        callback();
    });
  };

  AnimatedMap.prototype.waitUnit = function(unitId, callback) {
    var u = this.getUnitEntity(unitId);
    u.unit.moved = true;
    this.canvas.redrawEntity(u);
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.showAttack = function(unitId, targetId, damage, callback) {
    if(damage === null)
      return;
    
    var attacker = this.getUnitEntity(unitId);
    var target = this.getUnitEntity(targetId);
    
    var canvas = this.canvas;
    
    function doAttack() {
      target.unit.health -= damage;
      canvas.redrawEntities([target, attacker]);
      
      if(callback !== undefined) 
        callback();
    }
    
    if(attacker !== null && target !== null) {
      if(this.animate) {
        var va = $V([attacker.x, attacker.y]);
        var vt = $V([target.x, target.y]);
        
        var direction = vt.subtract(va).toUnitVector();
        var halfHex = this.xAxis.add(this.yAxis).multiply(0.5);
        var vx = $V([halfHex.e(1) * direction.e(1), halfHex.e(2) * direction.e(2)]);

        var damageParts = [];
        var damageString = "" + damage;
        var numbers = []
        for(var i = 0; i < damageString.length; ++i) {
          var n = parseInt(damageString[i]);
          var number = new MapDigit(n, target.x - (damageString.length - i) * this.theme.settings.number.width - 2, target.y, this);
          numbers.push(number);
          this.canvas.addEntity(number);
          var parts = [];
          parts.push(new aja.PauseAnimation(i*50 / this.animationSpeed));
          parts.push(new aja.PositionDeltaAnimation(number, 0, -2*this.theme.settings.image.height/3, 100 / this.animationSpeed, aja.easing.QuadOut));
          parts.push(new aja.PositionDeltaAnimation(number, 0, 2*this.theme.settings.image.height/3, 100 / this.animationSpeed, aja.easing.QuadIn));
          parts.push(new aja.PauseAnimation(200 / this.animationSpeed));
          damageParts.push(new aja.SequentialAnimation(parts));
        }
        damageParts.push(new aja.PauseAnimation(500 / this.animationSpeed));
        
        var parts = [];
        parts.push(new aja.PositionDeltaAnimation(attacker, vx.e(1), vx.e(2), 100 / this.animationSpeed));
        parts.push(new aja.ParallelAnimation(damageParts));
        parts.push(new aja.PositionDeltaAnimation(attacker, -vx.e(1), -vx.e(2), 200 / this.animationSpeed));
        
        this.canvas.addAnimation(new aja.SequentialAnimation(parts, function() {
          for(var i = 0; i < numbers.length; ++i) {
            canvas.removeEntity(numbers[i]);
          }
          
          doAttack();
        }));
      } else {
        doAttack();
      }
    } else {
      console.log("ERROR: unknown unit id");
    }
  };
  AnimatedMap.prototype.attackUnit = function(unitId, targetId, damage, callback) {
    var attacker = this.getUnitEntity(unitId);
    var canvas = this.canvas;
    this.showAttack(unitId, targetId, damage, function() {
      attacker.unit.moved = true;
      canvas.redrawEntity(attacker);
      
      if(callback !== undefined) 
        callback();
    });
  };

  AnimatedMap.prototype.counterattackUnit = function(unitId, targetId, damage, callback) {
    this.showAttack(unitId, targetId, damage, callback);
  };

  AnimatedMap.prototype.captureTile = function(unitId, tileId, left, callback) {
    var u = this.getUnitEntity(unitId);
    var t = this.getTile(tileId);
    var that = this;
    
    function doCapture() {
      if(!t.captureBar) {
        t.captureBar = new CaptureBar(t, that);
        that.canvas.addEntity(t.captureBar);
      }
      
      t.capturePoints = left;
      t.beingCaptured = true;
      t.captureBar.visible = t.capturePoints < 200;

      u.unit.moved = true;
      that.refresh();
      if(callback !== undefined) 
        callback();
    }
    
    if(this.animate) {
      this.canvas.addAnimation(new aja.SequentialAnimation([
        new aja.PositionDeltaAnimation(u, 0, -this.theme.settings.hex.height/2, 100 / this.animationSpeed, aja.easing.QuadOut),
        new aja.PositionDeltaAnimation(u, 0, this.theme.settings.hex.height/2, 100 / this.animationSpeed, aja.easing.QuadIn)
      ], doCapture));
    } else {
      doCapture();
    }
  };

  AnimatedMap.prototype.capturedTile = function(unitId, tileId, callback) {
    var u = this.getUnitEntity(unitId);
    var t = this.getTile(tileId);
    
    var that = this;
    
    function doCaptured() {
      if(!t.captureBar) {
        t.captureBar = new CaptureBar(t, that);
        that.canvas.addEntity(t.captureBar);
      }
      
      t.capturePoints = 1;
      t.beingCaptured = false;
      t.captureBar.visible = t.capturePoints < 200;

      t.owner = u.unit.owner;
      u.unit.moved = true;
      that.refresh();
      if(callback !== undefined) 
        callback();
    }
    
    if(this.animate) {
      var anim = new aja.SequentialAnimation([
        new aja.PositionDeltaAnimation(u, 0, -this.theme.settings.hex.height/2, 100 / this.animationSpeed, aja.easing.QuadOut),
        new aja.PositionDeltaAnimation(u, 0, this.theme.settings.hex.height/2, 100 / this.animationSpeed, aja.easing.QuadIn)
      ], doCaptured);
      anim.loops = 3;
      this.canvas.addAnimation(anim);
    } else {
      doCaptured();
    }
  };

  AnimatedMap.prototype.deployUnit = function(unitId, callback) {
    var u = this.getUnitEntity(unitId);
    var canvas = this.canvas;
    
    function doDeploy() {
      u.unit.deployed = true;
      u.unit.moved = true;
      canvas.redrawEntity(u);
      if(callback !== undefined) 
        callback();
    }
    
    if(this.animate) {
      var rumble = new aja.SequentialAnimation([
        new aja.PositionDeltaAnimation(u, 0, -this.theme.settings.hex.height / 8, 20 / this.animationSpeed, aja.easing.SineOut),
        new aja.PositionDeltaAnimation(u, 0, this.theme.settings.hex.height / 8, 20 / this.animationSpeed, aja.easing.SineIn)
      ]);
      rumble.loops = 3;
      
      this.canvas.addAnimation(new aja.SequentialAnimation([
        new aja.PositionDeltaAnimation(u, 0, -this.theme.settings.hex.height/2, 100 / this.animationSpeed, aja.easing.QuadOut),
        new aja.PauseAnimation(300 / this.animationSpeed),
        new aja.PositionDeltaAnimation(u, 0, this.theme.settings.hex.height/2, 100 / this.animationSpeed, aja.easing.QuadIn),
        rumble
      ], doDeploy));
    } else {
      doDeploy();
    }
  };

  AnimatedMap.prototype.undeployUnit = function(unitId, callback) {
    var u = this.getUnitEntity(unitId);
    var canvas = this.canvas;
    
    function doUndeploy() {
      u.unit.deployed = false;
      u.unit.moved = true;
      canvas.redrawEntity(u);
      if(callback !== undefined) 
        callback();
    }

    if(this.animate) {
      this.canvas.addAnimation(new aja.SequentialAnimation([
        new aja.PositionDeltaAnimation(u, 0, -this.theme.settings.hex.height/4, 50 / this.animationSpeed, aja.easing.QuadOut),
        new aja.PositionDeltaAnimation(u, 0, this.theme.settings.hex.height/4, 50 / this.animationSpeed, aja.easing.QuadIn)
      ], doUndeploy));
    } else {
      doUndeploy();
    }

  };

  AnimatedMap.prototype.loadUnit = function(unitId, carrierId, callback) {
    var u = this.getUnitEntity(unitId);
    var carrier = this.getUnitEntity(carrierId);
    carrier.unit.carriedUnits.push(u.unit);
    u.unit.moved = true;
    this.canvas.removeEntity(u);
    this.canvas.redrawEntity(carrier);
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.unloadUnit = function(unitId, carrierId, tileId, callback) {
    var t = this.getTile(tileId);
    var carrier = this.getUnitEntity(carrierId);

    var unit = carrier.unit.carriedUnits.filter(function(unit) { 
      return unit.unitId === unitId;
    })[0];
    
    carrier.unit.carriedUnits = carrier.unit.carriedUnits.filter(function(unit) { 
      return unit.unitId !== unitId;
    });
    
    var u = new MapUnit(unit, t.x, t.y, this);
    u.healthIndicator = new HealthIndicator(u);
    
    t.unit = u.unit;
    unit.moved = true;
    carrier.unit.moved = true;
    
    
    if(this.animate) {
      this.canvas.addAnimation(new aja.PositionAnimation(u, carrier.x, carrier.y, u.x, u.y, 200 / this.animationSpeed, aja.easing.Linear, callback));
      u.x = carrier.x;
      u.y = carrier.y;
    }
    
    this.canvas.redrawEntity(carrier);
    this.canvas.addEntity(u);
    this.canvas.addEntity(u.healthIndicator);
  };

  AnimatedMap.prototype.destroyUnit = function(unitId, callback) {
    var u = this.getUnitEntity(unitId);
    var t = this.getTile(u.tx, u.ty);
    
    var canvas = this.canvas;
    function doDestroy() {
      canvas.removeEntity(u);
      canvas.removeEntity(u.healthIndicator);
      t.unit = null;
      if(callback !== undefined) 
        callback();      
    }
    
    if(this.animate) {
      u.effects = [new aja.OpacityEffect];
      u.opacity = 1.0;
      this.canvas.addAnimation(new aja.NumberAnimation(u, {opacity: {from: 1.0, to: 0.0}}, 500 / this.animationSpeed, aja.easing.SineIn, doDestroy));
    } else {
      doDestroy();
    }
  };

  AnimatedMap.prototype.repairUnit = function(unitId, newHealth, callback) {
    var u = this.getUnitEntity(unitId);
    var change = newHealth - u.unit.health;
    
    if(change > 0 && this.animate) {
      var changeString = "" + change;
      var canvas = this.canvas;
      var that = this;
      
      for(var i = 0; i < changeString.length; ++i) {
        var n = parseInt(changeString[i]);
        var number = new MapDigit(n, u.x - (changeString.length - i) * this.theme.settings.number.width, u.y, this);
        number.effects = [new aja.OpacityEffect];
        number.opacity = 1.0;
        canvas.addEntity(number);
        var f = function(number) {
          var anim = new aja.NumberAnimation(number, {y:{delta:-32}, opacity: 0.0}, 1000 / that.animationSpeed, aja.easing.QuadIn, function() {
            canvas.removeEntity(number);
          });
          canvas.addAnimation(anim);
        }(number);
      }
    }
    
    u.unit.health = newHealth;
    this.canvas.redrawEntity(u);
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.buildUnit = function(tileId, unit, callback) {
    var t = this.getTile(tileId);
    
    t.unit = unit;
    unit.health = 100;
    unit.deployed = false;
    unit.moved = true;
    unit.carriedUnits = [];
    
    var u = new MapUnit(unit, t.x, t.y, this);
    u.healthIndicator = new HealthIndicator(u);

    if(this.animate) {
      u.effects = [new aja.OpacityEffect];
      u.opacity = 0.0;
      
      this.canvas.addAnimation(new aja.NumberAnimation(u, {opacity: {from: 0.0, to: 1.0}}, 500 / this.animationSpeed, aja.easing.SineIn, callback));
      this.canvas.addEntity(u);
      this.canvas.addEntity(u.healthIndicator);
    } else {
      this.canvas.addEntity(u);
      this.canvas.addEntity(u.healthIndicator);
      callback();
    }

  };
  
  AnimatedMap.prototype.regenerateCapturePointsTile = function(tileId, newCapturePoints, callback) {
    var t = this.getTile(tileId);
    if(!t.captureBar) {
      t.captureBar = new CaptureBar(t, this);
      this.canvas.addEntity(t.captureBar);
    }
    
    t.captureBar.visible = t.capturePoints < 200;
    
    t.capturePoints = newCapturePoints;
    t.beingCaptured = false;
    this.refresh();
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.produceFundsTile = function(tileId, callback) {
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.beginTurn = function(player, callback) {
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.endTurn = function(player, callback) {
    this.tiles.forEach(function(el){
      if(el.unit) {
        el.unit.moved = false;
      }
    });

    this.refresh();
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.turnTimeout = function(player, callback) {
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.finished = function(winner, callback) {
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.surrender = function(player, callback) {
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.PHASE_SELECT = 1;
  AnimatedMap.PHASE_MOVE = 2;
  AnimatedMap.PHASE_ATTACK = 3;
  AnimatedMap.PHASE_BUILD = 4;
  AnimatedMap.PHASE_ACTION = 5;
  AnimatedMap.PHASE_UNLOAD = 5;

  function MapUnit(unit, x, y, map) {
    this.map = map;
    this.tx = x;
    this.ty = y;
    this.setToHex(x, y);
    this.unit = unit;
    this.unitId = unit.unitId;
  }

  MapUnit.prototype.hexPos = function(x, y) {
    var pos = this.map.hex2rectCoords(x, y);
    var unitPos = $V([pos.e(1), pos.e(2) - (this.map.theme.settings.image.height - this.map.theme.settings.hex.height)]);
    return unitPos;
  }
  
  MapUnit.prototype.setToHex = function(x, y) {
    var pos = this.hexPos(x, y);
    this.x = pos.e(1);
    this.y = pos.e(2);
  }
  
  MapUnit.prototype.rect = function(ctx) {
    return {x: this.x, y: this.y, w: this.map.theme.settings.image.width, h: this.map.theme.settings.image.height };
  };

  MapUnit.prototype.draw = function(ctx) {
    var sprites = this.unit.moved ? this.map.spritesMoved : this.map.sprites;
    var coord = this.unit ? this.map.theme.getUnitCoordinates(this.unit.type, this.unit.owner) : null;
    if(coord) {
      ctx.drawImage(sprites,
                    coord.x, coord.y, this.map.theme.settings.image.width, this.map.theme.settings.image.height,
                    this.x, this.y, this.map.theme.settings.image.width, this.map.theme.settings.image.height);
    } 

    if(this.unit.deployed) {
      var deployCoord = this.map.theme.getDeployEmblemCoordinates();
      ctx.drawImage(sprites,
                    deployCoord.x, deployCoord.y, this.map.theme.settings.image.width, this.map.theme.settings.image.height,
                    this.x, this.y, this.map.theme.settings.image.width, this.map.theme.settings.image.height);
    }

    if(this.map.rules) {
      var unitType = this.map.rules.units[this.unit.type];
      if(unitType.carryNum > 0) {
          var freeCoords = this.map.theme.getCoordinates(this.map.theme.settings.carrierSlot.freeSlotName);
          var occupiedCoords = this.map.theme.getCoordinates(this.map.theme.settings.carrierSlot.occupiedSlotName);
          
        for(var i = 0; i < unitType.carryNum; ++i) {
          var slotCoords = i < this.unit.carriedUnits.length ? occupiedCoords : freeCoords;
          ctx.drawImage(this.map.sprites,
                        slotCoords.x, slotCoords.y, this.map.theme.settings.image.width, this.map.theme.settings.image.height,
                        this.x, this.y - i * this.map.theme.settings.carrierSlot.slotHeight, this.map.theme.settings.image.width, this.map.theme.settings.image.height);
        }
      }
    }
  }

  function MapDigit(n, x, y, map) {
    this.coord = map.theme.getHealthNumberCoordinates(n);
    this.x = x;
    this.y = y;
    this.z = 2;
    this.map = map;
  };

  MapDigit.prototype.draw = function(ctx) {
    ctx.drawImage(this.map.sprites,
                  this.coord.x, this.coord.y, this.map.theme.settings.image.width, this.map.theme.settings.image.height,
                  this.x, this.y, this.map.theme.settings.image.width, this.map.theme.settings.image.height);
  };

  MapDigit.prototype.rect = function(ctx) {
    return {x: this.x, y: this.y, w: this.map.theme.settings.image.width, h: this.map.theme.settings.image.height };
  };
  
  function Overlay(map) {
    this.canvas = document.createElement("canvas");
    this.resize(map.canvas.width, map.canvas.height);
  };
  
  Overlay.prototype.resize = function(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  };
  
  Overlay.prototype.draw = function(ctx) {
    ctx.drawImage(this.canvas, 0, 0);
  };
  
  Overlay.prototype.rect = function(ctx) {
    return {x: 0, y: 0, w: this.canvas.width, h: this.canvas.height };
  };
  
  function CaptureBar(tile, map) {
    this.tile = tile;
    this.map = map;
    
    var tileCoords = this.map.hex2rectCoords(tile.x, tile.y);
    this.x = tileCoords.e(1);
    this.y = tileCoords.e(2) - (this.map.theme.settings.image.height - this.map.theme.settings.hex.height) + this.map.theme.getTileOffset(tile.type, tile.subtype, tile.owner);
    this.z = 1;
  };
  
  CaptureBar.prototype.draw = function(ctx) {
    if(this.tile.capturePoints<200) {
      // draw capture bar
      var barCoords = this.map.theme.getCoordinates(this.map.theme.settings.captureBar.barName);
      var bitCoords = this.map.theme.getCoordinates(this.tile.beingCaptured ? this.map.theme.settings.captureBar.capturingName : this.map.theme.settings.captureBar.recoveringName);
      var numBits = Math.ceil(this.map.theme.settings.captureBar.totalBits * this.tile.capturePoints / 200);
      ctx.drawImage(this.map.sprites, barCoords.x, barCoords.y,
                    this.map.theme.settings.image.width, this.map.theme.settings.image.height,
                    this.x, this.y,
                    this.map.theme.settings.image.width, this.map.theme.settings.image.height);
      
      for(var i = 0; i < numBits; ++i) {
        ctx.drawImage(this.map.sprites, bitCoords.x, bitCoords.y,
                      this.map.theme.settings.image.width, this.map.theme.settings.image.height,
                      this.x, this.y - i * this.map.theme.settings.captureBar.bitHeight,
                      this.map.theme.settings.image.width, this.map.theme.settings.image.height);
        
      }
    }
  };

  CaptureBar.prototype.rect = function() {
    return {x: this.x, y: this.y, w: this.map.theme.settings.image.width, h: this.map.theme.settings.image.height };
  };

  
  function HealthIndicator(mapUnit) {
    this.mapUnit = mapUnit;
    this.z = 1;
  };
  
  HealthIndicator.prototype.draw = function(ctx) {
    if(this.mapUnit.unit.health < 100 && this.mapUnit.unit.health >= 0) {
      var healthString = "" + this.mapUnit.unit.health;
      
      for(var i = 0; i < healthString.length; ++i) {
        var n = healthString[i];
        var numCoord = this.mapUnit.map.theme.getHealthNumberCoordinates(n);
        ctx.drawImage(this.mapUnit.map.sprites,
                      numCoord.x, numCoord.y, this.mapUnit.map.theme.settings.image.width, this.mapUnit.map.theme.settings.image.height,
                      this.mapUnit.x - (healthString.length - 1 - i) * (this.mapUnit.map.theme.settings.number.width + 1), this.mapUnit.y, 
                      this.mapUnit.map.theme.settings.image.width, this.mapUnit.map.theme.settings.image.height);
      }
    }
  };

  HealthIndicator.prototype.rect = function() {
    return {x: this.mapUnit.x, y: this.mapUnit.y, w: this.mapUnit.map.theme.settings.image.width, h: this.mapUnit.map.theme.settings.image.height };
  };

  return AnimatedMap;
});
