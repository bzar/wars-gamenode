function Map(canvas, scale, theme, rules) {
    this.theme = theme ? theme : new Theme("pixel");
    this.autoscale = !scale;
    this.scale = scale;
    this.canvas = canvas;
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

    this.playerColors = {0: [0,0,0], // neutral color
                         1: [214,61,56],
                         2: [56,67,214],
                         3: [217,213,43],
                         4: [99,173,208]}
                         
    this.unitOffsetY = -12;
}

Map.prototype.getScale = function() {
    if(this.autoscale) {
        var mapSize = this.getMapSize();
        var horScale = this.canvas.width / (mapSize.w*this.tileW);
        var verScale = this.canvas.height / (mapSize.h*this.tileH);
        this.scale = horScale < verScale ? horScale : verScale;
    }
    return this.scale;
};
Map.prototype.getOffset = function() {
    if(this.autoscale) {
        var mapSize = this.getMapSize();
        var xOffset = mapSize.w < mapSize.h ? (mapSize.h - mapSize.w)*this.tileW / 2: 0;
        var yOffset = mapSize.w > mapSize.h ? (mapSize.w - mapSize.h)*this.tileH / 2: 0;
        return {x: xOffset, y: yOffset};
    } else {
        return {x: 0, y: 0};
    }
};
Map.prototype.preloadTiles = function(tiles, callback, images, prefix) {
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
Map.prototype.doPreload = function(callback) {
    this.sprites = new Image();
    this.sprites.src = this.theme.getSpriteSheetUrl();
    this.sprites.onload = callback;
};

Map.prototype.getMapSize = function() {
    // TODO: we could compensate for offsetted tiles
    var maxX = 0;
    var maxY = 0;
    this.currentTiles.forEach(function(tile){
        maxX = tile.x > maxX ? tile.x : maxX;
        maxY = tile.y > maxY ? tile.y : maxY;
    });
    return {w: maxX+1, h: maxY+1};
};

Map.prototype.getTile = function(x, y) {
    return this.currentTiles.filter(function(d) {
        if(d.x == x && d.y == y) return true;
    })[0];
};

Map.prototype.capturedPercentage = function(el) {
    return el.capturePoints / 200;
};

Map.prototype.clear = function() {
    var mapSize = this.getMapSize();
    var ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.getScale()*mapSize.w*this.tileW, this.getScale()*mapSize.h*this.tileH);
};

Map.prototype.paintTerrainTile = function(ctx, el, xPos, yPos) {
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

Map.prototype.paintUnit = function(x, y, unit, ctx) {
    var ctx = ctx ? ctx : this.canvas.getContext("2d");
    var xPos = this.tileW*x;
    var yPos = this.tileH*y + this.unitOffsetY;
    ctx.save();
    if(unit.moved) ctx.globalAlpha = 0.5;

    var coord = unit ? this.theme.getUnitCoordinates(unit.type, unit.owner) : null;
    if(coord) {
        ctx.drawImage(this.sprites,
                      coord.x*this.tileW, coord.y*this.tileH, this.tileW, this.tileH,
                      xPos, yPos, this.tileW, this.tileH);
    } 

    ctx.globalAlpha = 1.0;
    if(unit.deployed) {
        ctx.strokeStyle = "white";
        ctx.strokeRect(xPos, yPos, this.tileW-1, this.tileH-1);
    }
    var en = Math.ceil(parseInt(unit.health)/10);
    if(en<10) {
        var numCoord = this.theme.getHealthNumberCoordinates(en);
        var enX = xPos + this.tileW - 24;
        var enY = yPos + this.tileH - 24;
        ctx.drawImage(this.sprites,
                      numCoord.x*this.tileW, numCoord.y*this.tileH, this.tileW/2, this.tileH/2,
                      enX, enY, this.tileW/2, this.tileH/2);
    }
    
    if(this.rules) {
        var unitType = this.rules.units[unit.type];
        if(unitType.carryNum > 0) {
            for(var i = 0; i < unitType.carryNum; ++i) {
                if(i < unit.carriedUnits.length) {
                    ctx.strokeStyle = "white";
                    ctx.fillStyle = "#111";
                    ctx.strokeRect(xPos + 2, yPos + this.tileH - (i+1)*7, 5, 5);
                    //ctx.fillRect(xPos + 2, yPos + this.tileH - (i+1)*7, 5, 5);
                } else {
                    ctx.strokeStyle = "#111";
                    ctx.fillStyle = "white";
                    ctx.strokeRect(xPos + 2, yPos + this.tileH - (i+1)*7, 5, 5);
                    ctx.fillRect(xPos + 2, yPos + this.tileH - (i+1)*7, 5, 5);
                }
            }
        }
    }
    ctx.restore();
};

Map.prototype.paint = function(tiles) {
    var ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    var offset = this.getOffset();
    ctx.scale(this.getScale(), this.getScale());

    var this_ = this;
    tiles = tiles.sort(function(a, b){return a.y - b.y});
    tiles.forEach(function(el){
        var xPos = this_.tileW*el.x+offset.x;
        var yPos = this_.tileH*el.y+offset.y;
        this_.paintTerrainTile(ctx, el, xPos, yPos);

        if(el.unit) {
            this_.paintUnit(el.x, el.y, el.unit, ctx);
        }
    });

    ctx.restore();
};

Map.prototype.refresh = function() {
    this.clear();

    if(!this.autoscale) {
        var mapSize = this.getMapSize();

        var w = this.getScale() * mapSize.w * this.tileW;
        var h = this.getScale() * mapSize.h * this.tileH;

        this.canvas.width = w;
        this.canvas.height = h;

        $("#mapcontainer").width(w);
        $("#mapcontainer").height(h);
        $("#mapmask").width(w);
        $("#mapmask").height(h);
    }

    this.paint(this.currentTiles);

    if(this.showGrid) {
        this.paintGrid();
    }

    if(this.powerMap != null) {
        if(this.showPowerMap) {
            this.paintPowerMap(this.powerMap);
        }
        if(this.showBorders) {
            this.paintBorders(this.powerMap);
        }
    }
};

Map.prototype.paintMask = function(ctx, x, y,color) {
    ctx.fillRect(x * this.tileW, y * this.tileH, this.tileW, this.tileH);
};

Map.prototype.paintAttackMask = function(attacks) {
    var maskArray = this.parseAttacks(attacks, this.getMapSize());
    this.paintMaskArray(maskArray, false, true);
    this.paintDamageIndicators(attacks);
};

Map.prototype.paintUnloadMask = function(unloadOptions) {
    var maskArray = [];
    var mapWidth = this.getMapSize().w;
    for(i in unloadOptions) {
        var coord = unloadOptions[i];
        maskArray[coord.y * mapWidth + coord.x] = {};
    }
    this.paintMaskArray(maskArray, false, "blue");
};

Map.prototype.paintDamageIndicators = function(attacks) {
    var mapSize = this.getMapSize();
    var ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.scale(this.getScale(), this.getScale());

    for (i in attacks) {
        var power = attacks[i].power;
        ctx.fillStyle    = '#fff';
        ctx.font         = '15px sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText  (power + '%', attacks[i].pos.x*this.tileW+2, attacks[i].pos.y*this.tileH+2);
    }
    ctx.restore();
};

Map.prototype.paintMovementMask = function(maskArray, inverse) {
    if(!maskArray) this.paintMaskArray([]);

    var maskArray2 = this.createMovementMask(maskArray);
    this.paintMaskArray(maskArray2, !inverse);
};

Map.prototype.paintMaskArray = function(maskArray, inverse, useColor) {
    var mapSize = this.getMapSize();
    var ctx = this.canvas.getContext("2d");
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
};

Map.prototype.parseAttacks = function(attacklist, mapSize) {
    var arr = [];
    for (i in attacklist) {
        var option = attacklist[i];
        arr[option.pos.y*mapSize.w + option.pos.x] = {};
    }
    return arr;
};
Map.prototype.createMovementMask = function(movementOptions) {
    var maskArray2 = [];
    var mapSize = this.getMapSize();
    for (i in movementOptions) {
        var option = movementOptions[i];
        maskArray2[option.pos.y*mapSize.w + option.pos.x] = {};
    }

    return maskArray2;
};

Map.prototype.eventToTileX = function(event) {
    return Math.floor((event.pageX - $(this.canvas).offset().left)/ (this.getScale() * this.tileW));
};
Map.prototype.eventToTileY = function(event) {
    return Math.floor((event.pageY - $(this.canvas).offset().top)/ (this.getScale() * this.tileW));
};

Map.prototype.showGameEvents = function(gameEvents) {
    for(i in gameEvents) {
        var e = gameEvents[i];
        if(e.action == "attack") {
            this.drawAttackArrow(e.attacker.x, e.attacker.y, e.target.x, e.target.y);
        }
    }
};

Map.prototype.drawAttackArrow = function(x1, y1, x2, y2) {
    var ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.scale(this.getScale(), this.getScale());
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.lineWidth = 2.0;
    this.drawArrow(ctx, x1, y1, x2, y2);
    ctx.restore();
};

Map.prototype.drawArrow = function(ctx, x1, y1, x2, y2, arrowTipWidth, arrowTipLength) {
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
};

Map.prototype.getMapArray = function() {
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

Map.prototype.interpolateColor = function(baseColor, targetColor, scalar) {
    var color = [0,0,0];
    for(i in color) {
        color[i] = parseFloat(baseColor[i]) + parseFloat(scalar) * (parseFloat(targetColor[i]) - parseFloat(baseColor[i]));
    }
    return color;
};

Map.prototype.paintPowerMap = function(powerMap) {
    var ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.globalAlpha = 0.8;
    for(y in powerMap.tiles) {
        for(x in powerMap.tiles[y]) {
            y = parseInt(y);
            x = parseInt(x);
            var maxValuePlayer = powerMap.tiles[y][x].maxValuePlayer;
            if(maxValuePlayer in this.playerColors) {
                var valueScale = parseFloat(powerMap.tiles[y][x].maxValue) / parseFloat(powerMap.maxValue);
                var color = this.interpolateColor(this.playerColors[0], this.playerColors[maxValuePlayer], valueScale);
                ctx.fillStyle = "rgb(" + parseInt(color[0]) + "," + parseInt(color[1]) + "," + parseInt(color[2]) + ")";
                this.paintMask(ctx, x, y);
            }
        }
    }
    ctx.restore();
};

Map.prototype.paintBorders = function(powerMap) {
    var ctx = this.canvas.getContext("2d");
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
            var y1 = y*this.tileH;
            var x2 = (x+1)*this.tileW;
            var y2 = (y+1)*this.tileH;

            var color = this.playerColors[maxValuePlayer];
            ctx.strokeStyle = "rgb(" + parseInt(color[0]) + "," + parseInt(color[1]) + "," + parseInt(color[2]) + ")";
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
};

Map.prototype.paintGrid = function() {
    var ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    var mapSize = this.getMapSize();

    for(var y = 0; y < mapSize.h - 1; ++y) {
        ctx.moveTo(0, (y+1) * this.tileH);
        ctx.lineTo(mapSize.w * this.tileW, (y+1) * this.tileH);
    }

    for(var x = 0; x < mapSize.w - 1; ++x) {
        ctx.moveTo((x+1) * this.tileW, 0);
        ctx.lineTo((x+1) * this.tileW, mapSize.h * this.tileH);
    }

    ctx.stroke();
    ctx.restore();
};

Map.PHASE_SELECT = 1;
Map.PHASE_MOVE = 2;
Map.PHASE_ATTACK = 3;
Map.PHASE_BUILD = 4;
Map.PHASE_ACTION = 5;
Map.PHASE_UNLOAD = 5;
