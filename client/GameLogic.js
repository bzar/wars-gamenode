function GameLogic(map, rules) {
    this.map = map;
    this.rules = rules;
}

if(typeof(exports) !== "undefined") {
  exports.GameLogic = GameLogic;
}

if(typeof(define) !== "undefined") {
  define(function() {
    return GameLogic;
  });
}

GameLogic.prototype.getNeighborTiles = function(mapArray, x, y) {
    var adjacent = [{x: x - 1, y: y}, {x: x, y: y - 1}, 
                    {x: x + 1, y: y}, {x: x, y: y + 1}, 
                    {x: x + 1, y: y - 1}, {x: x - 1, y: y + 1}];
    var neighbors = [];
    for(var i = 0; i < adjacent.length; ++i) {
      if(mapArray[adjacent[i].y] && mapArray[adjacent[i].y][adjacent[i].x]) {
        neighbors.push(adjacent[i]);
      }
    }
    return neighbors;
};

GameLogic.prototype.getDistance = function(x1, y1, x2, y2) {
  var distance = 0;
  if(x1 < x2 && y1 > y2) {
    var diagonal = Math.min(x2 - x1, y1 - y2);
    x1 += diagonal;
    y1 -= diagonal;
    distance += diagonal;
  } else if(x1 > x2 && y1 < y2) {
    var diagonal = Math.min(x1 - x2, y2 - y1);
    x2 += diagonal;
    y2 -= diagonal;
    distance += diagonal;
  } 
  
  distance += Math.abs(x2 - x1)
  distance += Math.abs(y2 - y1);

  return distance;
}

GameLogic.prototype.tileHasMovableUnit = function(player, x, y) {
    var tile = this.map.getTile(x, y);
    if(!tile || !tile.unit) {
        return false;
    } else if(tile.unit.owner != player) {
        return false;
    } else if(tile.unit.moved) {
        return false;
    }

    return true;
};

GameLogic.prototype.tileCanBuild = function(player, x, y) {
    var tile = this.map.getTile(x, y);
    if(!tile || tile.owner != player) {
        return false;
    } else if(tile.unit) {
        return false;
    } else if(this.rules.terrains[tile.type].buildTypes.length == 0) {
        return false;
    }

    return true;
};

GameLogic.prototype.tileBuildOptions = function(x, y) {
    var tile = this.map.getTile(x, y);
    var terrain = this.rules.terrains[tile.type];
    var buildOptions = [];

    for(i in this.rules.units) {
        var unitType = this.rules.units[i];

        var canBuild = false;

        for(j in terrain.buildTypes) {
            if(terrain.buildTypes[j] == unitType.unitClass) {
                canBuild = true;
                break;
            }
        }

        if(!canBuild) {
            continue;
        }

        var banned = false;

        for(k in this.rules.bannedUnits) {
            if(this.rules.bannedUnits[k] == unitType.id) {
                banned = true;
                break;
            }
        }

        if(!banned) {
            buildOptions.push(unitType);
        }
    }


    return buildOptions;
};

GameLogic.prototype.unitCanMovePath = function(x, y, dx, dy, path) {
  var mapArray = this.map.getMapArray();
  var unit = mapArray[y][x].unit;

  if(unit === null) {
    console.log("no unit at (" + x + ", " + y + ")");
    return false;
  }
  
  var unitType = this.rules.units[unit.type];
  
  if(unit.deployed && (x != dx || y != dy)) {
    return false;
  }
  
  var unitMovementType = this.rules.movementTypes[unitType.movementType];
  
  var left = unitType.movement;
  
  for(var i = 1; i < path.length; ++i) {
    var node = path[i];
    var tile = mapArray[node.y][node.x];
    
    // Reject if does not exist
    if(tile === undefined)
      return false;
    
    // Reject if tile has an enemy unit
    if(tile.unit !== null && tile.unit.owner != unit.owner) {
      return false;
    }
    
    // Determine cost
    var cost = 1;
    if(tile.type in unitMovementType.effectMap) {
      cost = unitMovementType.effectMap[tile.type];
    }

    // Reject if cannot move on terrain or cost is too high
    if(cost == null || cost > left) {
      return false;
    }
    
    left -= cost;
  }
  
  return true;
}
GameLogic.prototype.unitCanMoveTo = function(x, y, dx, dy) {
  var mapArray = this.map.getMapArray();
  var unit = mapArray[y][x].unit;

  if(unit === null) {
    console.log("no unit at (" + x + ", " + y + ")");
    return null;
  }
  
  var unitType = this.rules.units[unit.type];
  
  if(unit.deployed && (x != dx || y != dy)) {
    return false;
  }
  
  var unitMovementType = this.rules.movementTypes[unitType.movementType];
  
  var from = {};
  var next = {tile: mapArray[y][x], left: unitType.movement, next: null, from: null,
              distance: this.getDistance(x, y, dx, dy)};
  
  function addNode(node) {
    function isBefore(a, b) {
      if(a.left > b.left) {
        return true
      } else if(a.left == b.left && a.distance < b.distance) {
        return true
      } else {
        return false;
      }
    }
    
    if(next === null || isBefore(node, next)) {
      node.next = next;
      next = node;
    } else {
      var pos = next;
      while(pos.next !== null && isBefore(pos.next, node)) {
        pos = pos.next;
      }
      node.next = pos.next;
      pos.next = node;
    }
  }
  
  while(next !== null) {
    // Take the next best node from list
    var current = next;
    next = current.next;

    // Add node as visited
    if(from[current.tile.y] === undefined)
      from[current.tile.y] = {}
    from[current.tile.y][current.tile.x] = current.from;
    
    // Check end condition
    if(current.tile.x == dx && current.tile.y == dy) {
      var path = [];
      while(current !== null) {
        path.push({x: current.tile.x, y: current.tile.y});
        current = from[current.tile.y][current.tile.x];
      }
      return path.reverse();
    }
    
    // Process neighbors
    var neighbors = this.getNeighborTiles(mapArray, current.tile.x, current.tile.y);
    for(var i = 0; i < neighbors.length; ++i) {
      var tile = mapArray[neighbors[i].y][neighbors[i].x];

      // Reject if does not exist
      if(tile === undefined) {
        continue;
      }
      
      // Reject if visited
      if(from[tile.y] !== undefined && from[tile.y][tile.x] !== undefined) {
        continue;
      }
      
      // Reject if tile has an enemy unit
      if(tile.unit !== null && tile.unit.owner != unit.owner) {
        continue;
      }
      
      // Determine cost
      var cost = 1;
      if(tile.type in unitMovementType.effectMap) {
        cost = unitMovementType.effectMap[tile.type];
      }

      // Reject if cannot move on terrain or cost is too high
      if(cost == null || cost > current.left) {
          continue;
      }
      
      // Search list for existing node for same tile
      var previous = null;
      var existing = next;
      while(existing !== null && (existing.tile.x != tile.x || existing.tile.y != tile.y)) {
        previous = existing;
        existing = existing.next;
      }
      
      // Create node
      var node = {
        tile: tile, 
        left: current.left - cost, 
        next: null, 
        from: current, 
        distance: this.getDistance(tile.x, tile.y, dx, dy)
      }
      
      if(existing === null) {
        // If node points to a new tile, add node to the list
        addNode(node);
      } else {
        // Otherwise if new route is cheaper, remove the old node and add the new one
        if(existing.left < node.left) {
          if(previous === null) {
            next = existing.next;
          } else {
            previous.next = existing.next;
          }
          existing.next = null;
          addNode(node);
        }
      }
    }
  }
  
  return false;
}

GameLogic.prototype.unitMovementOptions = function(x, y) {
    var mapArray = this.map.getMapArray();
    var unit = mapArray[y][x].unit;

    if(unit === undefined) {
        return null;
    }

    var unitType = this.rules.units[unit.type];

    if(unit.deployed) {
        return [{pos:{x:x, y:y}, prev:null, n:unitType.movement}]
    }

    var unitMovementType = this.rules.movementTypes[unitType.movementType];

    var movementOptions = [];
    var destinationOptions = [];
    
    var bfsQueue = [{pos:{x:x, y:y}, prev:null, n:unitType.movement}];

    while(bfsQueue.length != 0) {
        var node = bfsQueue.shift();

        var addNode = true;
        var nodeIndex = undefined;
        var oldNodeLongerPath = false;

        for(var i = 0; i < movementOptions.length; ++i) {
            var option = movementOptions[i];

            if(option.pos.x == node.pos.x &&
               option.pos.y == node.pos.y) {
                if(option.n < node.n) {
                    nodeIndex = i;
                } else {
                    oldNodeLongerPath = true;
                }
                break;
            }
        }

        if(oldNodeLongerPath) {
            continue;
        }

        var targetTile = mapArray[node.pos.y][node.pos.x];

        if(targetTile.unit &&
           (node.pos.x != x || node.pos.y != y) &&
           !this.unitCanLoadInto(x, y, node.pos.x, node.pos.y)) {
            addNode = false;
        }

        if(addNode) {
            var destinationIndex = undefined
            for(var i = 0; i < destinationOptions.length; ++i) {
                var option = destinationOptions[i];

                if(option.pos.x == node.pos.x &&
                   option.pos.y == node.pos.y) {
                    destinationIndex = i;
                    break;
                }
            }
            
            if(destinationIndex === undefined) {
                destinationOptions.push(node);
            } else {
                destinationOptions[i] = node;
            }
        }
        
        if(nodeIndex === undefined) {
            movementOptions.push(node);
        } else {
            movementOptions[i] = node;
        }

        if(node.n == 0) {
            continue;
        }

        var neighbors = this.getNeighborTiles(mapArray, node.pos.x, node.pos.y);

        for(var i = 0; i < neighbors.length; ++i) {
            neighbor = neighbors[i];

            if(node.prev !== null &&
               neighbor.x == node.prev.pos.x &&
               neighbor.y == node.prev.pos.y) {
                continue;
            }

            var tile = mapArray[neighbor.y][neighbor.x];
            var cost = 1;

            if(tile.type in unitMovementType.effectMap) {
                cost = unitMovementType.effectMap[tile.type];
            }

            if(cost == null) {
                continue;
            }


            if(cost > node.n) {
                continue;
            }

            if(tile.unit != null) {
                if(tile.unit.owner != unit.owner) {
                    continue;
                }
            }

            var newNode = {pos:{x: neighbor.x, y: neighbor.y}, prev: node, n: node.n - cost}
            bfsQueue.push(newNode);
        }
    }

    return destinationOptions;
};

GameLogic.prototype.calculateAttackPower = function(unit, distance, targetArmor) {
    var unitType = this.rules.units[unit.type];
    var primaryPower = null;
    var secondaryPower = null;
    var primaryWeapon = this.rules.weapons[unitType.primaryWeapon];
    var secondaryWeapon = this.rules.weapons[unitType.secondaryWeapon];

    if(primaryWeapon != null && distance in primaryWeapon.rangeMap &&
        targetArmor.id in primaryWeapon.powerMap &&
        (!primaryWeapon.requireDeployed || unit.deployed)) {

        primaryPower = parseInt(primaryWeapon.rangeMap[distance] * primaryWeapon.powerMap[targetArmor.id] / 100);
    }

    if(secondaryWeapon != null && distance in secondaryWeapon.rangeMap &&
        targetArmor.id in secondaryWeapon.powerMap &&
        (!secondaryWeapon.requireDeployed || unit.deployed)) {

        secondaryPower = parseInt(secondaryWeapon.rangeMap[distance] * secondaryWeapon.powerMap[targetArmor.id] / 100);
    }

    var weaponPower = null;
    if(primaryPower == null) {
        weaponPower = secondaryPower;
    } else if(secondaryPower == null) {
        weaponPower = primaryPower;
    } else {
        weaponPower = Math.max(primaryPower, secondaryPower);
    }

    return weaponPower;
};

GameLogic.prototype.calculateDamage = function(unit, unitTile, target, targetTile) {
    var targetUnitType = this.rules.units[target.type];
    var targetArmor = this.rules.armors[targetUnitType.armor];
    var distance = this.getDistance(targetTile.x, targetTile.y, unitTile.x, unitTile.y);

    var weaponPower = this.calculateAttackPower(unit, distance, targetArmor);

    if(weaponPower == null) {
        return null;
    }

    var targetTileType = this.rules.terrains[targetTile.type];
    var targetDefense = targetTileType.defense;
    if(targetTile.type in targetUnitType.defenseMap) {
        targetDefense = targetUnitType.defenseMap[targetTile.type];
    }

    var power = parseInt(unit.health * weaponPower * parseInt(100 - targetDefense * target.health / 100) / 100 / 100);

    if(power == 0) {
        power = 1;
    }

    return power;
}

GameLogic.prototype.unitAttackOptions = function(x1, y1, x2, y2) {
    var attackOptions = [];
    var tile = this.map.getTile(x1, y1);
    var attackFromTile = this.map.getTile(x2, y2);
    var unit = tile.unit;

    if(unit === undefined) {
        return null;
    }

    var unitType = this.rules.units[unit.type];
    var mapArray = this.map.getMapArray();
    
    for(var ty in mapArray) {
      for(var tx in mapArray[ty]) {
        var targetTile = mapArray[ty][tx]

        if(targetTile.unit == null) {
            continue;
        }

        var targetUnit = targetTile.unit;

        if(targetUnit.owner == unit.owner) {
            continue;
        }

        var power = this.calculateDamage(unit, attackFromTile, targetUnit, targetTile);
        if(power !== null) {
          attackOptions.push({pos:{x:tx, y:ty}, power:power});
        }
      }
    }

    return attackOptions;
};

GameLogic.prototype.unitCanCapture = function(x1, y1, x2, y2) {
    var tile = this.map.getTile(x1, y1);
    var unit = tile.unit;
    var unitType = this.rules.units[unit.type];
    var targetTile = this.map.getTile(x2, y2);
    var targetTileType = this.rules.terrains[targetTile.type];
    if(targetTile.owner == unit.owner) {
        return false;
    }

    var capturable = false;
    for(var i = 0; i < targetTileType.flags.length; ++i) {
        var flag = this.rules.terrainFlags[targetTileType.flags[i]];
        if(flag.name == "Capturable") {
            capturable = true;
            break;
        }
    }

    if(!capturable) {
        return false;
    }

    for(var i = 0; i < unitType.flags.length; ++i) {
        var flag = this.rules.unitFlags[unitType.flags[i]];
        if(flag.name == "Capture") {
            return true;
        }
    }
    return false;
};

GameLogic.prototype.unitCanWait = function(x1, y1, x2, y2) {
    var targetTile = this.map.getTile(x2, y2);

    if(targetTile.unit != null && (x1 != x2 || y1 != y2)) {
        return false;
    }

    return true;
}
GameLogic.prototype.unitCanDeploy = function(x1, y1, x2, y2) {
    var tile = this.map.getTile(x1, y1);
    var unit = tile.unit;

    if(unit.deployed) {
        return false;
    }

    var targetTile = this.map.getTile(x2, y2);

    if(targetTile.unit != null && (x1 != x2 || y1 != y2)) {
        return false;
    }

    var unitType = this.rules.units[unit.type];

    if((unitType.primaryWeapon != null &&
        this.rules.weapons[unitType.primaryWeapon].requireDeployed) ||
       (unitType.secondaryWeapon != null &&
        this.rules.weapons[unitType.secondaryWeapon].requireDeployed)) {
        return true;
    }

    return false;
};

GameLogic.prototype.unitCanUndeploy = function(x, y) {
    var tile = this.map.getTile(x, y);
    var unit = tile.unit;

    if(unit.deployed) {
        return true;
    }

    return false;
};

GameLogic.prototype.unitCanLoadInto = function(x1, y1, x2, y2) {
    var tile = this.map.getTile(x1, y1);
    var unit = tile.unit;
    var unitType = this.rules.units[unit.type];

    var targetTile = this.map.getTile(x2, y2);
    var otherUnit = targetTile.unit;

    if(otherUnit == null || otherUnit.unitId == unit.unitId) {
        return false;
    }

    var otherUnitType = this.rules.units[otherUnit.type];

    if(otherUnit.owner == unit.owner &&
        otherUnit.carriedUnits.length < otherUnitType.carryNum &&
        unitType.unitClass in otherUnitType.carryClasses) {
        return true;
    }


    return false;
};

GameLogic.prototype.unitCanUnload = function(x1, y1, x2, y2) {
    var mapArray = this.map.getMapArray();
    var tile = mapArray[y1][x1];
    var unit = tile.unit;

    if(unit.carriedUnits === undefined || unit.carriedUnits.length == 0) {
        return false;
    }

    var fromTile = mapArray[y2][x2];
    var neighbors = this.getNeighborTiles(mapArray, fromTile.x, fromTile.y);

    for(var j = 0; j < unit.carriedUnits.length; ++j) {
        var carriedUnit = unit.carriedUnits[j];
        var carriedUnitType = this.rules.units[carriedUnit.type];
        var carriedUnitMovementType = this.rules.movementTypes[carriedUnitType.movementType];

        if(fromTile.type in carriedUnitMovementType.effectMap &&
           (carriedUnitMovementType.effectMap[fromTile.type] == null ||
            carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)) {
            continue;
        }

        for(var i = 0; i < neighbors.length; ++i) {
            var neighbor = neighbors[i];
            var toTile = mapArray[neighbor.y][neighbor.x];

            // cannot unload to tile with unit, unless the tile is the carrier unit's origin tile 
            // and the carrier moves away from that tile on the same turn
            if(toTile.unit != null && !((x1 != x2 || y1 != y2) && (neighbor.x == x1 && neighbor.y == y1))) {
                continue;
            }

            if(!(toTile.type in carriedUnitMovementType.effectMap) ||
               (carriedUnitMovementType.effectMap[toTile.type] != null &&
                carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)) {
                return true;
            }
        }
    }

    return false;
};

GameLogic.prototype.unitUnloadOptions = function(x1, y1, x2, y2) {
    var mapArray = this.map.getMapArray();
    var tile = mapArray[y1][x1];
    var unit = tile.unit;

    if(unit.carriedUnits.length == 0) {
        return [];
    }

    var fromTile = mapArray[y2][x2];
    var neighbors = this.getNeighborTiles(mapArray, fromTile.x, fromTile.y);
    var unloadOptions = [];

    for(var j = 0; j < unit.carriedUnits.length; ++j) {
        var carriedUnit = unit.carriedUnits[j];
        var carriedUnitType = this.rules.units[carriedUnit.type];
        var carriedUnitMovementType = this.rules.movementTypes[carriedUnitType.movementType];

        if(fromTile.type in carriedUnitMovementType.effectMap &&
           (carriedUnitMovementType.effectMap[fromTile.type] == null ||
            carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)) {
            continue;
        }

        for(var i = 0; i < neighbors.length; ++i) {
            var neighbor = neighbors[i];
            var toTile = mapArray[neighbor.y][neighbor.x];

            // cannot unload to tile with unit, unless the tile is the carrier unit's origin tile 
            // and the carrier moves away from that tile on the same turn
            if(toTile.unit != null && !((x1 != x2 || y1 != y2) && (neighbor.x == x1 && neighbor.y == y1))) {
                continue;
            }

            if(!(toTile.type in carriedUnitMovementType.effectMap) ||
               (carriedUnitMovementType.effectMap[toTile.type] != null &&
                carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)) {
                unloadOptions.push(carriedUnit);
                break;
            }
        }
    }

    return unloadOptions;
};

GameLogic.prototype.unitUnloadTargetOptions = function(x1, y1, x2, y2, unitId) {
    var mapArray = this.map.getMapArray();
    var tile = mapArray[y1][x1];
    var unit = tile.unit;

    if(unit.carriedUnits.length == 0) {
        return [];
    }

    var fromTile = mapArray[y2][x2];
    var neighbors = this.getNeighborTiles(mapArray, fromTile.x, fromTile.y);
    var unloadOptions = [];

    var carriedUnit = undefined;
    var carriedUnitType = undefined;
    var carriedUnitMovementType = undefined;

    for(var i = 0; i < unit.carriedUnits.length; ++i) {
        if(unit.carriedUnits[i].unitId == unitId) {
            carriedUnit = unit.carriedUnits[i];
            carriedUnitType = this.rules.units[carriedUnit.type];
            carriedUnitMovementType = this.rules.movementTypes[carriedUnitType.movementType];
        }
    }

    if(carriedUnit === undefined) {
        return null;
    }

    if(fromTile.type in carriedUnitMovementType.effectMap &&
        (carriedUnitMovementType.effectMap[fromTile.type] == null ||
        carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)) {
        return null;
    }


    for(var i = 0; i < neighbors.length; ++i) {
        var neighbor = neighbors[i];
        var toTile = mapArray[neighbor.y][neighbor.x];

        // cannot unload to tile with unit, unless the tile is the carrier unit's origin tile 
        // and the carrier moves away from that tile on the same turn
        if(toTile.unit != null && !((x1 != x2 || y1 != y2) && (neighbor.x == x1 && neighbor.y == y1))) {
            continue;
        }

        if(!(toTile.type in carriedUnitMovementType.effectMap) ||
           (carriedUnitMovementType.effectMap[toTile.type] != null &&
            carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)) {
            unloadOptions.push(neighbor);
        }
    }

    return unloadOptions;
};

GameLogic.prototype.getPowerMap = function() {
    var mapArray = this.map.getMapArray();

    var powerMap = {tiles:[], maxValue:0};
    for(y in mapArray) {
        powerMap.tiles.push([]);

        for(x in mapArray[y]) {
            powerMap.tiles[y].push({maxValue:0, maxValuePlayer:0, values:{}});
        }
    }

    for(y in mapArray) {
        y = parseInt(y);

        for(x in mapArray[y]) {
            x = parseInt(x);
            var unit = mapArray[y][x].unit;

            if(unit == null) {
                continue;
            }

            var unitType = this.rules.units[unit.type];

            var movementOptions = this.unitMovementOptions(x, y);

            if(movementOptions == null) {
                continue;
            }

            var influenceTiles = [];
            var influenceDivisor = 0;

            for(mi in movementOptions) {
                var movementOption = movementOptions[mi];
                var attackOptions = [];

                for(ty in mapArray) {
                    ty = parseInt(ty);
                    for(tx in mapArray[ty]) {
                        tx = parseInt(tx);
                        var distance = this.getDistance(movementOption.pos.x, movementOption.pos.y, tx, ty);
                        if((unitType.primaryWeapon != null &&
                            (!this.rules.weapons[unitType.primaryWeapon].requireDeployed || unit.deployed) &&
                            distance in this.rules.weapons[unitType.primaryWeapon].rangeMap) ||
                           (unitType.secondaryWeapon != null &&
                            (!this.rules.weapons[unitType.secondaryWeapon].requireDeployed || unit.deployed) &&
                            distance in this.rules.weapons[unitType.secondaryWeapon].rangeMap)) {
                            attackOptions.push({x:tx, y:ty});
                        }

                    }
                }
                for(ai in attackOptions) {
                    influenceDivisor += 1;
                    var attackOption = attackOptions[ai];
                    var newTile = true;
                    for(ii in influenceTiles) {
                        var influenceTile = influenceTiles[ii];
                        if(influenceTile.pos.x == attackOption.x &&
                           influenceTile.pos.y == attackOption.y) {
                            influenceTile.n += 1;
                            newTile = false;
                        }
                    }
                    if(newTile) {
                        influenceTiles.push({pos:{x:attackOption.x, y:attackOption.y}, n:1});
                    }
                }
            }

            for(ii in influenceTiles) {
                var influenceTile = influenceTiles[ii];
                var powerMapTile = powerMap.tiles[influenceTile.pos.y][influenceTile.pos.x];
                if(!(unit.owner in powerMapTile.values)) {
                    powerMapTile.values[unit.owner] = 0.0;
                }
                var influence = unit.health * influenceTile.n * unitType.price / influenceDivisor / 100;
                powerMapTile.values[unit.owner] += influence;
                if(powerMapTile.values[unit.owner] > powerMapTile.maxValue) {
                    powerMapTile.maxValue = powerMapTile.values[unit.owner];
                    powerMapTile.maxValuePlayer = unit.owner;
                    if(powerMapTile.values[unit.owner] > powerMap.maxValue) {
                        powerMap.maxValue = powerMapTile.values[unit.owner];
                    }
                } else if(powerMapTile.values[unit.owner] == powerMapTile.maxValue &&
                          unit.owner != powerMapTile.maxValuePlayer) {
                    powerMapTile.maxValue = powerMapTile.values[unit.owner];
                    powerMapTile.maxValuePlayer = 0;
                }
            }

        }
    }

    return powerMap;
};
