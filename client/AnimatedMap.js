define(["Theme", "aja/lib/aja", "vec2d", "pixastic.hsl"], function(Theme) {
  function AnimatedMap(canvasId, scale, theme, rules) {
      this.theme = theme ? theme : new Theme("pixel");
      this.autoscale = !scale;
      this.scale = scale;
      this.canvas = new aja.Canvas(canvasId);
      this.animationSpeed = 1.0;
      this.animate = true;
      
      this.canvas.renderOrder = function(a, b) {
        if(a.z === undefined) {
          if(b.z === undefined) {
            return a.y - b.y;
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
      
      this.tileW = 48;
      this.tileH = 48;
      this.tilemap = null;
      this.unitmap = null;
      this.guimap = null;
      this.currentTiles = null;
      this.rules = rules;
      
      this.powerMap = null;
      this.showPowerMap = false;
      this.showBorders = false;
      this.showGrid = false;

      this.unitOffsetY = -12;
      this.unitEntities = {};
  }

  AnimatedMap.prototype.getScale = function() {
      if(this.autoscale) {
          var mapSize = this.getMapSize();
          var horScale = this.canvas.width / (mapSize.w*this.tileW);
          var verScale = this.canvas.height / (mapSize.h*this.tileH);
          this.scale = horScale < verScale ? horScale : verScale;
      }
      return this.scale;
  };
  AnimatedMap.prototype.getOffset = function() {
      if(this.autoscale) {
          var mapSize = this.getMapSize();
          var xOffset = mapSize.w < mapSize.h ? (mapSize.h - mapSize.w)*this.tileW / 2: 0;
          var yOffset = mapSize.w > mapSize.h ? (mapSize.w - mapSize.h)*this.tileH / 2: 0;
          return {x: xOffset, y: yOffset};
      } else {
          return {x: 0, y: 0};
      }
  };
  AnimatedMap.prototype.preloadTiles = function(tiles, callback, images, prefix) {
      var imgPrefix = prefix ? prefix : tiles["prefix"];
      if(!(images instanceof Array)) {
          images = [];
          }
      if(tiles instanceof Array) {
          var this_ = this;
          tiles.forEach(function(el){
              var moreImages = [];
              moreImages = this_.preloadTiles(el, null, moreImages, imgPrefix);
              images.push(moreImages);
          });
      } else {
          if(tiles=="") return null;
          var img = new Image();
          img.src = imgPrefix + tiles;
          return img;
      }
      if(callback) window.setTimeout(callback, 0);
      return images;
  };
  AnimatedMap.prototype.doPreload = function(callback) {
      this.sprites = new Image();
      this.spritesMoved = new Image();
      var sprites = this.sprites;
      var spritesMoved = this.spritesMoved;
      this.sprites.src = this.theme.getSpriteSheetUrl();
      var that = this ;
      sprites.onload = function() {
        spritesMoved.src = sprites.src;
        spritesMoved.onload = function() {
          Pixastic.process(spritesMoved, "hsl", {hue:0,saturation:-30,lightness:-30}, function(img) {
            that.spritesMoved = img;
            callback();
          });
        }
      }
  };

  AnimatedMap.prototype.getMapSize = function() {
      // TODO: we could compensate for offsetted tiles
      var maxX = 0;
      var maxY = 0;
      this.currentTiles.forEach(function(tile){
          maxX = tile.x > maxX ? tile.x : maxX;
          maxY = tile.y > maxY ? tile.y : maxY;
      });
      return {w: maxX+1, h: maxY+1};
  };

  AnimatedMap.prototype.getTile = function(x, y) {
      if(x !== undefined && y !== undefined) {
        return this.currentTiles.filter(function(d) {
            if(d.x == x && d.y == y) return true;
        })[0];
      } else if(x !== undefined) {
        var tiles = this.currentTiles.filter(function(tile){
          return tile.tileId == x;
        });
        return tiles.length != 0 ? tiles[0] : null;
      } else {
        return null;
      }
  };

  AnimatedMap.prototype.capturedPercentage = function(el) {
      return el.capturePoints / 200;
  };

  AnimatedMap.prototype.clear = function() {
      var mapSize = this.getMapSize();
      var ctx = this.canvas.background.getContext("2d");
      ctx.clearRect(0, 0, this.getScale()*mapSize.w*this.tileW, this.getScale()*mapSize.h*this.tileH);
  };

  AnimatedMap.prototype.paintTerrainTile = function(ctx, el, xPos, yPos) {
      var coord = this.theme.getTileCoordinates(el.type, el.subtype, el.owner);
      if(coord) {
          // draw tile
          ctx.drawImage(this.sprites,
                        coord.x*this.tileW, coord.y*this.tileH, this.tileW, this.tileH,
                        xPos, yPos, this.tileW, this.tileH);
          if(el.capturePoints<200) {
              // draw capture bar
              if(el.beingCaptured) {
                  ctx.fillStyle = "red";
              } else {
                  ctx.fillStyle = "lightblue";
              }
              ctx.strokeStyle = "black";
              var height = this.tileH*this.capturedPercentage(el);
              ctx.fillRect(xPos, yPos+(this.tileH-height), this.tileW/8, height);
              ctx.strokeRect(xPos, yPos, this.tileW/8, this.tileH);
          }
      } else {
          ctx.fillRect(xPos + 12, yPos + 12, this.tileW/2, this.tileH/2);
      }
  };

  AnimatedMap.prototype.paintTiles = function(tiles) {
      var ctx = this.canvas.background.getContext("2d");
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      var offset = this.getOffset();
      ctx.scale(this.getScale(), this.getScale());

      var this_ = this;
      
      var offset = this.getOffset();
      ctx.translate(offset.x, offset.y - this.unitOffsetY);
      
      ctx.fillStyle = "#eee";
      ctx.fillRect(0, this.unitOffsetY, this.canvas.width, -this.unitOffsetY);
      
      tiles.forEach(function(el){
          var xPos = this_.tileW*el.x;
          var yPos = this_.tileH*el.y;
          this_.paintTerrainTile(ctx, el, xPos, yPos);
      });

      ctx.restore();
  };

  AnimatedMap.prototype.refresh = function() {
      this.clear();

      if(!this.autoscale) {
          var mapSize = this.getMapSize();

          var w = this.getScale() * mapSize.w * this.tileW;
          var h = this.getScale() * mapSize.h * this.tileH - this.unitOffsetY;

          if(w !== this.canvas.width || h !== this.canvas.height) {
            this.canvas.resize(w, h);
          }
          
          $("#mapcontainer").width(w);
          $("#mapcontainer").height(h);
          $("#mapmask").width(w);
          $("#mapmask").height(h);
      }

      this.paintTiles(this.currentTiles);


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

  AnimatedMap.prototype.paintMask = function(ctx, x, y,color) {
      ctx.fillRect(x * this.tileW, y * this.tileH - this.unitOffsetY, this.tileW, this.tileH);
  };

  AnimatedMap.prototype.paintAttackMask = function(attacks) {
      var maskArray = this.parseAttacks(attacks, this.getMapSize());
      this.paintMaskArray(maskArray, false, true);
      this.paintDamageIndicators(attacks);
  };

  AnimatedMap.prototype.paintUnloadMask = function(unloadOptions) {
      var maskArray = [];
      var mapWidth = this.getMapSize().w;
      for(i in unloadOptions) {
          var coord = unloadOptions[i];
          maskArray[coord.y * mapWidth + coord.x] = {};
      }
      this.paintMaskArray(maskArray, false, "blue");
      this.canvas.forceRedraw();
  };

  AnimatedMap.prototype.paintDamageIndicators = function(attacks) {
      var mapSize = this.getMapSize();
      var ctx = this.canvas.background.getContext("2d");
      ctx.save();
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
      ctx.restore();
      this.canvas.forceRedraw();
  };

  AnimatedMap.prototype.paintMovementMask = function(maskArray, inverse) {
      if(!maskArray) this.paintMaskArray([]);

      var maskArray2 = this.createMovementMask(maskArray);
      this.paintMaskArray(maskArray2, !inverse);
  };

  AnimatedMap.prototype.paintMaskArray = function(maskArray, inverse, useColor) {
      var mapSize = this.getMapSize();
      var ctx = this.canvas.background.getContext("2d");
      ctx.save();
      ctx.scale(this.getScale(), this.getScale());
      ctx.fillStyle = useColor ? "rgba(255,32,32,0.7)" : "rgba(0,0,0,0.5)";
      if(useColor=="blue") ctx.fillStyle = "rgba(32,32,255,0.5)";
      for(var ii = 0; ii < mapSize.w*mapSize.h; ++ii) {
          var y = parseInt(parseInt(ii) / mapSize.w);
          var x = parseInt(ii) % mapSize.w;
          if(inverse ? !maskArray[ii] : maskArray[ii]) {
              this.paintMask(ctx, x, y);
          }
      }
      ctx.restore();
      this.canvas.forceRedraw();
  };

  AnimatedMap.prototype.parseAttacks = function(attacklist, mapSize) {
      var arr = [];
      for (i in attacklist) {
          var option = attacklist[i];
          arr[option.pos.y*mapSize.w + option.pos.x] = {};
      }
      return arr;
  };
  AnimatedMap.prototype.createMovementMask = function(movementOptions) {
      var maskArray2 = [];
      var mapSize = this.getMapSize();
      for (i in movementOptions) {
          var option = movementOptions[i];
          maskArray2[option.pos.y*mapSize.w + option.pos.x] = {};
      }

      return maskArray2;
  };

  AnimatedMap.prototype.eventToTileX = function(event) {
      return Math.floor((event.pageX - $(this.canvas).offset().left)/ (this.getScale() * this.tileW));
  };
  AnimatedMap.prototype.eventToTileY = function(event) {
      return Math.floor((event.pageY - $(this.canvas).offset().top + this.unitOffsetY)/ (this.getScale() * this.tileW));
  };

  AnimatedMap.prototype.showGameEvents = function(gameEvents) {
      for(i in gameEvents) {
          var e = gameEvents[i];
          if(e.action == "attack") {
              this.drawAttackArrow(e.attacker.x, e.attacker.y, e.target.x, e.target.y);
          }
      }
  };

  AnimatedMap.prototype.tileWithUnit = function(unitId) {
    var tiles = this.currentTiles.filter(function(tile){
      return tile.unit !== null && tile.unit.unitId == unitId;
    });
    
    return tiles.length != 0 ? tiles[0] : null;
  }
  AnimatedMap.prototype.drawAttackArrow = function(x1, y1, x2, y2) {
      var ctx = this.canvas.background.getContext("2d");
      ctx.save();
      ctx.scale(this.getScale(), this.getScale());
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'red';
      ctx.lineWidth = 2.0;
      this.drawArrow(ctx, x1, y1, x2, y2);
      ctx.restore();
  };

  AnimatedMap.prototype.drawArrow = function(ctx, x1, y1, x2, y2, arrowTipWidth, arrowTipLength) {
      if(arrowTipWidth == undefined) arrowTipWidth = 5.0;
      if(arrowTipLength == undefined) arrowTipLength = 7.0;

      // Calculate absolute coordinates from the center of tile 1 to the center of tile 2
      var x1a = x1*this.tileW + this.tileW/2;
      var y1a = y1*this.tileH + this.tileH/2;
      var x2a = x2*this.tileW + this.tileW/2;
      var y2a = y2*this.tileH + this.tileH/2;

      // Draw the arrow line
      ctx.beginPath();
      ctx.moveTo(x1a, y1a);
      ctx.lineTo(x2a, y2a);
      ctx.stroke();
      ctx.closePath();

      // Calculate helper vectors for determining tip vertices
      // a = (ax, ay) is the arrow line vector
      // b = (bx, by) is a unit vector perpendicular to (ax, ay)
      var ax = parseFloat(x2a-x1a);
      var ay = parseFloat(y2a-y1a);
      var arrowLength = Math.sqrt(ax*ax+ay*ay);
      var bx = ay/arrowLength;
      var by = -ax/arrowLength;

      // Calculate remaining tip vertices (use as the first)
      // t1 = (t1x, t1y) = (|a| - arrowTipLength) * (a/|a|) + arrowTipWidth * b
      // t2 = (t2x, t2y) = (|a| - arrowTipLength) * (a/|a|) + arrowTipWidth * -b
      var t1x = (arrowLength - arrowTipLength) * ax/arrowLength + arrowTipWidth * bx;
      var t1y = (arrowLength - arrowTipLength) * ay/arrowLength + arrowTipWidth * by;
      var t2x = (arrowLength - arrowTipLength) * ax/arrowLength - arrowTipWidth * bx;
      var t2y = (arrowLength - arrowTipLength) * ay/arrowLength - arrowTipWidth * by;

      // Draw the arrow tip (translate t1 and t2 to world coordinates by adding arrow base position)
      ctx.beginPath();
      ctx.moveTo(x2a, y2a);
      ctx.lineTo(x1a + t1x, y1a + t1y);
      ctx.lineTo(x1a + t2x, y1a + t2y);
      ctx.moveTo(x2a, y2a);
      ctx.fill();
      ctx.closePath();
      this.canvas.forceRedraw();
  };

  AnimatedMap.prototype.getMapArray = function() {
      var mapArray = [];
      this.currentTiles.forEach(function(tile){
          if(tile.y >= mapArray.length) {
              var difference = tile.y - mapArray.length + 1;
              for(var i = 0; i < difference; ++i) {
                  mapArray.push([]);
              }
          }
          if(tile.x >= mapArray[tile.y].length) {
              mapArray[tile.y].length = tile.x + 1;
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

  AnimatedMap.prototype.initUnitEntities = function() {
    var self = this;
    this.currentTiles.forEach(function(el){
      if(el.unit) {
        var unit = new MapUnit(el.unit, el.x, el.y, self);
        self.canvas.addEntity(unit);
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

  AnimatedMap.prototype.moveUnit = function(unitId, tileId, path, callback) {
    var u = this.getUnitEntity(unitId);
    var prevTile = this.getTile(u.tx, u.ty);
    var t = this.getTile(tileId);
    
    var that = this;
    function doMove() {
      prevTile.unit = null;
      if(t.unit === null)
        t.unit = u.unit;
      
      that.canvas.eraseEntity(u);
      u.tx = t.x;
      u.ty = t.y;
      u.x = t.x * that.tileW;
      u.y = t.y * that.tileH;
      that.canvas.drawEntity(u);
      
      if(callback !== undefined) 
        callback();
    }
    
    if(u !== null) {
      if(path.length > 1 && this.animate) {
        var pathSegments = [];
        for(var i = 1; i < path.length; ++i) {
          var prev = path[i - 1];
          var next = path[i];
          pathSegments.push(new aja.PositionAnimation(u, prev.x * this.tileW, prev.y * this.tileH, next.x * this.tileW, next.y * this.tileH, 200 / this.animationSpeed));
        }
        this.canvas.addAnimation(new aja.SequentialAnimation(pathSegments, function() {
          doMove();
        }));
      } else {
        doMove();
      }
    } else {
      console.log("ERROR: unknown tile id: " + tileId);
    }
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
        var va = new Vec2D(attacker.x, attacker.y);
        var vt = new Vec2D(target.x, target.y);
        
        var vx = vt.subtract(va).uniti();
        vx.x *= this.tileW/2;
        vx.y *= this.tileH/2;

        var damageParts = [];
        var damageString = "" + damage;
        var numbers = []
        for(var i = 0; i < damageString.length; ++i) {
          var n = parseInt(damageString[i]);
          var number = new MapDigit(n, vt.x + i*this.tileW/4, vt.y + this.tileH/2, this);
          numbers.push(number);
          this.canvas.addEntity(number);
          var parts = [];
          parts.push(new aja.PauseAnimation(i*50 / this.animationSpeed));
          parts.push(new aja.PositionDeltaAnimation(number, 0, -2*this.tileH/3, 100 / this.animationSpeed, aja.easing.QuadOut));
          parts.push(new aja.PositionDeltaAnimation(number, 0, 2*this.tileH/3, 100 / this.animationSpeed, aja.easing.QuadIn));
          damageParts.push(new aja.SequentialAnimation(parts));
        }
        damageParts.push(new aja.PauseAnimation(500 / this.animationSpeed));
        
        var parts = [];
        parts.push(new aja.PositionDeltaAnimation(attacker, vx.x, vx.y, 100 / this.animationSpeed));
        parts.push(new aja.ParallelAnimation(damageParts));
        parts.push(new aja.PositionDeltaAnimation(attacker, -vx.x, -vx.y, 200 / this.animationSpeed));
        
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
    t.capturePoints = left;
    t.beingCaptured = true;
    u.unit.moved = true;
    this.refresh();
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.capturedTile = function(unitId, tileId, callback) {
    var u = this.getUnitEntity(unitId);
    var t = this.getTile(tileId);
    t.capturePoints = 1;
    t.beingCaptured = false;
    t.owner = u.unit.owner;
    u.unit.moved = true;
    this.refresh();
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.deployUnit = function(unitId, callback) {
    var u = this.getUnitEntity(unitId);
    u.unit.deployed = true;
    u.unit.moved = true;
    this.canvas.redrawEntity(u);
    if(callback !== undefined) 
      callback();
  };

  AnimatedMap.prototype.undeployUnit = function(unitId, callback) {
    var u = this.getUnitEntity(unitId);
    u.unit.deployed = false;
    u.unit.moved = true;
    this.canvas.redrawEntity(u);
    if(callback !== undefined) 
      callback();
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
    
    t.unit = u.unit;
    unit.moved = true;
    carrier.unit.moved = true;
    
    
    if(this.animate) {
      this.canvas.addAnimation(new aja.PositionAnimation(u, carrier.x, carrier.y, u.x, u.y, 200 / this.animationSpeed, aja.easing.Linear, callback));
      u.x = carrier.x;
      u.y = carrier.y;
    }
    
    this.canvas.addEntity(u);
  };

  AnimatedMap.prototype.destroyUnit = function(unitId, callback) {
    var u = this.getUnitEntity(unitId);
    var t = this.getTile(u.tx, u.ty);
    
    var canvas = this.canvas;
    function doDestroy() {
      canvas.removeEntity(u);
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
    if(this.animate) {
      u.effects = [new aja.OpacityEffect];
      u.opacity = 0.0;
      
      this.canvas.addAnimation(new aja.NumberAnimation(u, {opacity: {from: 0.0, to: 1.0}}, 500 / this.animationSpeed, aja.easing.SineIn, callback));
      this.canvas.addEntity(u);
    } else {
      this.canvas.addEntity(u);
      callback();
    }

  };
  
  AnimatedMap.prototype.regenerateCapturePointsTile = function(tileId, newCapturePoints, callback) {
    var t = this.getTile(tileId);
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
    this.currentTiles.forEach(function(el){
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
  
  AnimatedMap.prototype.showMovementIndicator = function(unitId, x, y) {
    var u = this.getUnitEntity(unitId);
    if(u) {
      this.hideMovementIndicator();
      this.movementIndicator = new MapUnit(u.unit, x, y, this);
      this.movementIndicator.effects = [new aja.OpacityEffect];
      this.movementIndicator.opacity = 0.75;
      this.canvas.addEntity(this.movementIndicator);
    }
  };

  AnimatedMap.prototype.hideMovementIndicator = function() {
    if(this.movementIndicator) {
      this.canvas.removeEntity(this.movementIndicator);
      this.movementIndicator = null;
    }
  };
  
  AnimatedMap.PHASE_SELECT = 1;
  AnimatedMap.PHASE_MOVE = 2;
  AnimatedMap.PHASE_ATTACK = 3;
  AnimatedMap.PHASE_BUILD = 4;
  AnimatedMap.PHASE_ACTION = 5;
  AnimatedMap.PHASE_UNLOAD = 5;

  function MapUnit(unit, x, y, map) {
    this.tx = x;
    this.ty = y;
    this.x = x * map.tileW;
    this.y = y * map.tileH;
    this.unit = unit;
    this.unitId = unit.unitId;
    this.map = map;
  }

  MapUnit.prototype.rect = function(ctx) {
    return {x: this.x, y: this.y, w: this.map.tileW, h: this.map.tileH - this.map.unitOffsetY };
  };

  MapUnit.prototype.draw = function(ctx) {
    ctx.save();
    
    if(this.unit.deployed) {
      ctx.strokeStyle = "white";
      ctx.strokeRect(this.x, this.y - this.map.unitOffsetY, this.map.tileW-1, this.map.tileH-1);
    }
    
    var sprites = this.unit.moved ? this.map.spritesMoved : this.map.sprites;
    var coord = this.unit ? this.map.theme.getUnitCoordinates(this.unit.type, this.unit.owner) : null;
    if(coord) {
      ctx.drawImage(sprites,
                    coord.x*this.map.tileW, coord.y*this.map.tileH, this.map.tileW, this.map.tileH,
                    this.x, this.y, this.map.tileW, this.map.tileH);
    } 

    var en = Math.ceil(parseInt(this.unit.health)/10);
    if(en<10 && en >= 0) {
      var numCoord = this.map.theme.getHealthNumberCoordinates(en);
      var enX = this.x + this.map.tileW - 24;
      var enY = this.y + this.map.tileH - 24;
      ctx.drawImage(this.map.sprites,
                    numCoord.x*this.map.tileW, numCoord.y*this.map.tileH, this.map.tileW/2, this.map.tileH/2,
                    enX, enY, this.map.tileW/2, this.map.tileH/2);
    }
    
    if(this.map.rules) {
      var unitType = this.map.rules.units[this.unit.type];
      if(unitType.carryNum > 0) {
        ctx.strokeStyle = "#111";
        ctx.fillStyle = "#fff";
        for(var i = 0; i < unitType.carryNum; ++i) {
          if(i < this.unit.carriedUnits.length) {
            ctx.fillRect(this.x + 2, this.y + this.map.tileH - (i+1)*7, 5, 5);
            ctx.strokeRect(this.x + 2, this.y + this.map.tileH - (i+1)*7, 5, 5);
          } else {
            ctx.strokeStyle = "#fff";
            ctx.strokeRect(this.x + 2, this.y + this.map.tileH - (i+1)*7, 5, 5);
          }
        }
      }
    }
    ctx.restore();
  }

  function MapDigit(n, x, y, map) {
    this.coord = map.theme.getHealthNumberCoordinates(n);
    this.x = x;
    this.y = y;
    this.z = 1;
    this.map = map;
  };

  MapDigit.prototype.draw = function(ctx) {
    ctx.drawImage(this.map.sprites,
                  this.coord.x * this.map.tileW, this.coord.y * this.map.tileH, this.map.tileW/2, this.map.tileH/2,
                  this.x, this.y, this.map.tileW/2, this.map.tileH/2);
  };

  MapDigit.prototype.rect = function(ctx) {
    return {x: this.x, y: this.y, w: this.map.tileW/2, h: this.map.tileH/2 };
  };
  
  return AnimatedMap;
});