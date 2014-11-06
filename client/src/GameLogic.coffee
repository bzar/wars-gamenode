findIndex = (l, p) ->
  for e, i in l
    return i if p(e)
  return null

find = (l, p) ->
  i = findIndex(l, p)
  return if i isnt null then l[i] else null

any = (l, p) -> find(l, p) isnt null
all = (l, p) -> find(l, (i) -> not p(i)) is null

  
class GameLogic
  constructor: (@map, @rules) ->

exports.GameLogic = GameLogic  if typeof (exports) isnt "undefined"
if define?
  define ->
    GameLogic

GameLogic::getNeighborTiles = (mapArray, x, y) ->
  adjacent = [
    x: x - 1
    y: y
  ,
    x: x
    y: y - 1
  ,
    x: x + 1
    y: y
  ,
    x: x
    y: y + 1
  ,
    x: x + 1
    y: y - 1
  ,
    x: x - 1
    y: y + 1
  ]
  neighbors = []

  for a in adjacent
    neighbors.push a if mapArray[a.y] and mapArray[a.y][a.x]
    
  return neighbors

GameLogic::getDistance = (x1, y1, x2, y2) ->
  distance = 0
  if x1 < x2 and y1 > y2
    diagonal = Math.min(x2 - x1, y1 - y2)
    x1 += diagonal
    y1 -= diagonal
    distance += diagonal
  else if x1 > x2 and y1 < y2
    diagonal = Math.min(x1 - x2, y2 - y1)
    x2 += diagonal
    y2 -= diagonal
    distance += diagonal
  distance += Math.abs(x2 - x1)
  distance += Math.abs(y2 - y1)
  return distance

GameLogic::areAllies = (playerNumber1, playerNumber2) ->
  return true if playerNumber1 is playerNumber2
  p1 = @map.getPlayer(playerNumber1)
  p2 = @map.getPlayer(playerNumber2)
  return false if not p1? or not p2?
  return p1.teamNumber? and p2.teamNumber? and p1.teamNumber is p2.teamNumber

GameLogic::areEnemies = (playerNumber1, playerNumber2) -> not @areAllies playerNumber1, playerNumber2

GameLogic::tileHasMovableUnit = (player, x, y) ->
  tile = @map.getTile(x, y)
  if not tile or not tile.unit
    return false
  else unless tile.unit.owner is player
    return false

  return not tile.unit.moved

GameLogic::tileCanBuild = (player, x, y) ->
  tile = @map.getTile(x, y)
  if not tile? or tile.owner isnt player or tile.unit? or tile.capturePoints < 200
    return false
  else
    return @rules.terrains[tile.type].buildTypes.length isnt 0

GameLogic::tileBuildOptions = (x, y) ->
  tile = @map.getTile(x, y)
  terrain = @rules.terrains[tile.type]
  buildOptions = []
  for unitId, unitType of @rules.units
    canBuild = false
    continue if all terrain.buildTypes, (buildType) -> buildType isnt unitType.unitClass
    continue if any @rules.bannedUnits, (bannedUnit) -> bannedUnit is unitType.id
    buildOptions.push unitType
  return buildOptions

GameLogic::unitCanMovePath = (x, y, dx, dy, path) ->
  return true if x is dx and y is dy
  mapArray = @map.getMapArray()
  unit = mapArray[y][x].unit
  return false if unit is null
  return false  if unit.deployed and (x isnt dx or y isnt dy)
  unitType = @rules.units[unit.type]
  unitMovementType = @rules.movementTypes[unitType.movementType]
  left = unitType.movement
  prev = path[0]
  
  for node in path[1..]
    return false if @getDistance(prev.x, prev.y, node.x, node.y) isnt 1
    tile = mapArray[node.y][node.x]
    
    # Reject if does not exist
    return false  if not tile?
    
    # Reject if tile has an enemy unit
    return false  if tile.unit isnt null and @areEnemies(tile.unit.owner, unit.owner)
    
    # Determine cost
    cost = 1
    cost = unitMovementType.effectMap[tile.type]  if tile.type of unitMovementType.effectMap
    
    # Reject if cannot move on terrain or cost is too high
    return false  if not cost? or cost > left
    left -= cost
    prev = node
    
  return true

GameLogic::unitCanMoveTo = (x, y, dx, dy) ->
  addNode = (node, next) ->
    isBefore = (a, b) -> a.left > b.left or (a.left is b.left and a.distance < b.distance)

    if next is null or isBefore(node, next)
      node.next = next
      return node
    else
      pos = next
      pos = pos.next  while pos.next isnt null and isBefore(pos.next, node)
      node.next = pos.next
      pos.next = node
      return next
      
  mapArray = @map.getMapArray()
  unit = mapArray[y][x].unit  
  return null if not unit?
  unitType = @rules.units[unit.type]
  return null  if unit.deployed and (x isnt dx or y isnt dy)
  unitMovementType = @rules.movementTypes[unitType.movementType]
  
  from = {}
  next =
    tile: mapArray[y][x]
    left: unitType.movement
    next: null
    from: null
    distance: @getDistance(x, y, dx, dy)

  while next isnt null
    # Take the next best node from list
    current = next
    next = current.next
    
    # Add node as visited
    from[current.tile.y] = {}  if not from[current.tile.y]?
    from[current.tile.y][current.tile.x] = current.from
    
    # Check end condition
    if current.tile.x is dx and current.tile.y is dy
      path = []
      while current isnt null
        path.push
          x: current.tile.x
          y: current.tile.y

        current = from[current.tile.y][current.tile.x]
      return path.reverse()
    
    # Process neighbors
    neighbors = @getNeighborTiles(mapArray, current.tile.x, current.tile.y)

    for neighbor in neighbors
      tile = mapArray[neighbor.y][neighbor.x]
      
      # Reject if does not exist
      continue  if not tile?
      
      # Reject if visited
      continue  if tile.y of from and tile.x of from[tile.y]
      
      # Reject if tile has an enemy unit
      continue  if tile.unit isnt null and @areEnemies(tile.unit.owner, unit.owner)
      
      # Determine cost
      cost = 1
      cost = unitMovementType.effectMap[tile.type]  if tile.type of unitMovementType.effectMap
      
      # Reject if cannot move on terrain or cost is too high
      continue  if not cost? or cost > current.left
      
      # Search list for existing node for same tile
      previous = null
      existing = next
      while existing isnt null and 
            (existing.tile.x isnt tile.x or existing.tile.y isnt tile.y)
        previous = existing
        existing = existing.next
      
      # Create node
      node =
        tile: tile
        left: current.left - cost
        next: null
        from: current
        distance: @getDistance(tile.x, tile.y, dx, dy)

      if existing is null
        # If node points to a new tile, add node to the list
        next = addNode node, next
      else
        # Otherwise if new route is cheaper, remove the old node and add the new one
        if existing.left < node.left
          if previous is null
            next = existing.next
          else
            previous.next = existing.next
          existing.next = null
          next = addNode node, next

  return null

GameLogic::getPath = (movementTypeId, playerNumber, x, y, dx, dy, maxCostPerNode, maxCost, acceptNextTo) ->
  addNode = (node, next) ->
    isBefore = (a, b) -> a.cost < b.cost or (a.cost is b.cost and a.distance < b.distance)
    if next is null or isBefore(node, next)
      node.next = next
      return node
    else
      pos = next
      pos = pos.next  while pos.next isnt null and isBefore(pos.next, node)
      node.next = pos.next
      pos.next = node
      return next
      
  mapArray = @map.getMapArray()
  unitMovementType = @rules.movementTypes[movementTypeId]
  from = {}
  next =
    tile: mapArray[y][x]
    cost: 0
    next: null
    from: null
    distance: @getDistance(x, y, dx, dy)

  while next?
    # Take the next best node from list
    current = next
    next = current.next
    
    # Add node as visited
    from[current.tile.y] = {}  if current.tile.y not of from
    from[current.tile.y][current.tile.x] = current.from
    
    # Check end condition
    if @getDistance(current.tile.x, current.tile.y, dx, dy) <= (if acceptNextTo then 1 else 0)
      path = []
      while current isnt null        
        path.push
          x: current.tile.x
          y: current.tile.y
          cost: current.cost

        current = from[current.tile.y][current.tile.x]
      return path.reverse()
    
    # Process neighbors
    neighbors = @getNeighborTiles(mapArray, current.tile.x, current.tile.y)

    for neighbor in neighbors
      tile = mapArray[neighbor.y][neighbor.x]
      
      # Reject if does not exist
      continue  unless tile?
      
      # Reject if visited
      continue  if tile.y of from and tile.x of from[tile.y]
      
      # Reject if tile has an enemy unit
      continue  if tile.unit isnt null and @areEnemies(tile.unit.owner, playerNumber)
      
      # Determine cost
      cost = 1
      cost = unitMovementType.effectMap[tile.type]  if tile.type of unitMovementType.effectMap
      continue  if cost is null or 
                   (maxCostPerNode? and maxCostPerNode < cost) or 
                   (maxCost? and maxCost < cost + current.cost)
      
      # Search list for existing node for same tile
      previous = null
      existing = next
      while existing isnt null and (existing.tile.x isnt tile.x or existing.tile.y isnt tile.y)
        previous = existing
        existing = existing.next
      
      # Create node
      node =
        tile: tile
        cost: current.cost + cost
        next: null
        from: current
        distance: @getDistance(tile.x, tile.y, dx, dy)

      # If node points to a new tile, add node to the list
      # Otherwise if new route is cheaper, remove the old node and add the new one
      if existing is null
        next = addNode node, next
      else if existing.cost > node.cost
        if previous is null
          next = existing.next
        else
          previous.next = existing.next
        existing.next = null
        next = addNode node, next

  return null

GameLogic::unitMovementOptions = (x, y) ->
  mapArray = @map.getMapArray()
  unit = mapArray[y][x].unit
  return null if not unit?
  unitType = @rules.units[unit.type]
  return [{pos:{x: x, y: y}, prev: null, n: unitType.movement}] if unit.deployed
    
  unitMovementType = @rules.movementTypes[unitType.movementType]
  movementOptions = []
  destinationOptions = []
  bfsQueue = [{pos:{x: x, y: y}, prev: null, n: unitType.movement}]
  
  until bfsQueue.length is 0
    node = bfsQueue.shift()
    
    nodeIndex = findIndex movementOptions, (o) -> o.pos.x is node.pos.x and o.pos.y is node.pos.y
    continue if nodeIndex? and movementOptions[nodeIndex].n >= node.n
    
    targetTile = mapArray[node.pos.y][node.pos.x]

    if not targetTile.unit? or 
       (node.pos.x is x and node.pos.y is y) or 
       @unitCanLoadInto(x, y, node.pos.x, node.pos.y)
      destinationIndex = findIndex destinationOptions, (o) -> o.pos.x is node.pos.x and o.pos.y is node.pos.y

      if destinationIndex is null
        destinationOptions.push node
      else
        destinationOptions[destinationIndex] = node
        
    if nodeIndex is null
      movementOptions.push node
    else
      movementOptions[nodeIndex] = node
    
    continue  if node.n is 0
    
    neighbors = @getNeighborTiles(mapArray, node.pos.x, node.pos.y)

    for neighbor in neighbors
      continue  if node.prev isnt null and 
                   neighbor.x is node.prev.pos.x and 
                   neighbor.y is node.prev.pos.y
      tile = mapArray[neighbor.y][neighbor.x]
      cost = 1
      cost = unitMovementType.effectMap[tile.type]  if tile.type of unitMovementType.effectMap
      continue if cost is null
      continue if cost > node.n
      continue if tile.unit? and @areEnemies(tile.unit.owner, unit.owner)
      
      newNode =
        pos:
          x: neighbor.x
          y: neighbor.y
        prev: node
        n: node.n - cost

      bfsQueue.push newNode
  return destinationOptions

GameLogic::calculateAttackPower = (unit, distance, targetArmor) ->
  unitType = @rules.units[unit.type]
  primaryPower = null
  secondaryPower = null
  primaryWeapon = @rules.weapons[unitType.primaryWeapon]
  secondaryWeapon = @rules.weapons[unitType.secondaryWeapon]
  
  weaponPower = (w) -> 
    return null if not w? or 
                   distance not of w.rangeMap or 
                   targetArmor.id not of w.powerMap or 
                   (w.requireDeployed and not unit.deployed)
    return parseInt(w.rangeMap[distance] * w.powerMap[targetArmor.id] / 100)
  
  primaryPower = weaponPower primaryWeapon
  secondaryPower = weaponPower secondaryWeapon
  
  unless primaryPower?
    return secondaryPower
  else unless secondaryPower?
    return primaryPower
  else
    return Math.max(primaryPower, secondaryPower)

GameLogic::calculateDamage = (unit, unitTile, target, targetTile) ->
  targetUnitType = @rules.units[target.type]
  targetArmor = @rules.armors[targetUnitType.armor]
  distance = @getDistance(targetTile.x, targetTile.y, unitTile.x, unitTile.y)
  weaponPower = @calculateAttackPower(unit, distance, targetArmor)
  return null  unless weaponPower?
  targetTileType = @rules.terrains[targetTile.type]
  targetDefense = targetTileType.defense
  targetDefense = targetUnitType.defenseMap[targetTile.type] if targetTile.type of targetUnitType.defenseMap
  power = parseInt(unit.health * weaponPower * parseInt(100 - targetDefense * target.health / 100) / 100 / 100)
  return Math.max(power, 1)

GameLogic::unitAttackOptions = (x1, y1, x2, y2) ->
  attackOptions = []
  tile = @map.getTile(x1, y1)
  attackFromTile = @map.getTile(x2, y2)
  unit = tile.unit
  return null unless unit?
  unitType = @rules.units[unit.type]
  mapArray = @map.getMapArray()
  for ty of mapArray
    for tx of mapArray[ty]
      targetTile = mapArray[ty][tx]
      continue  unless targetTile.unit?
      targetUnit = targetTile.unit
      continue  if @areAllies(targetUnit.owner, unit.owner)
      power = @calculateDamage(unit, attackFromTile, targetUnit, targetTile)
      if power isnt null
        attackOptions.push
          pos:
            x: parseInt(tx)
            y: parseInt(ty)
          power: power

  return attackOptions

GameLogic::unitCanCapture = (x1, y1, x2, y2) ->
  tile = @map.getTile(x1, y1)
  unit = tile.unit
  unitType = @rules.units[unit.type]
  targetTile = @map.getTile(x2, y2)
  targetTileType = @rules.terrains[targetTile.type]
  return false  if @areAllies(targetTile.owner, unit.owner)
  capturable = false

  for flagName in targetTileType.flags
    flag = @rules.terrainFlags[flagName]
    if flag.name is "Capturable"
      capturable = true
      break
  return false  unless capturable

  for flagName in unitType.flags
    flag = @rules.unitFlags[flagName]
    return true  if flag.name is "Capture"

  return false

GameLogic::unitCanWait = (x1, y1, x2, y2) ->
  targetTile = @map.getTile(x2, y2)
  return not targetTile.unit? or x1 is x2 and y1 is y2

GameLogic::unitCanDeploy = (x1, y1, x2, y2) ->
  tile = @map.getTile(x1, y1)
  unit = tile.unit
  return false  if unit.deployed
  targetTile = @map.getTile(x2, y2)
  return false  if targetTile.unit? and (x1 isnt x2 or y1 isnt y2)
  unitType = @rules.units[unit.type]
  return (unitType.primaryWeapon? and @rules.weapons[unitType.primaryWeapon].requireDeployed) or 
         (unitType.secondaryWeapon? and @rules.weapons[unitType.secondaryWeapon].requireDeployed)

GameLogic::unitCanUndeploy = (x, y) ->
  tile = @map.getTile(x, y)
  unit = tile.unit
  return unit.deployed

GameLogic::unitCanLoadInto = (x1, y1, x2, y2) ->
  tile = @map.getTile(x1, y1)
  unit = tile.unit
  unitType = @rules.units[unit.type]
  targetTile = @map.getTile(x2, y2)
  otherUnit = targetTile.unit
  return false  if not otherUnit? or otherUnit.unitId is unit.unitId
  otherUnitType = @rules.units[otherUnit.type]
  return otherUnit.owner is unit.owner and 
         otherUnit.carriedUnits.length < otherUnitType.carryNum and 
         unitType.unitClass of otherUnitType.carryClasses

GameLogic::unitCanUnload = (x1, y1, x2, y2) ->
  mapArray = @map.getMapArray()
  tile = mapArray[y1][x1]
  unit = tile.unit
  return false unless unit.carriedUnits? and unit.carriedUnits.length isnt 0
  fromTile = mapArray[y2][x2]
  neighbors = @getNeighborTiles(mapArray, fromTile.x, fromTile.y)

  for carriedUnit in unit.carriedUnits
    carriedUnitType = @rules.units[carriedUnit.type]
    carriedUnitMovementType = @rules.movementTypes[carriedUnitType.movementType]
    continue  if fromTile.type of carriedUnitMovementType.effectMap and 
                 (not carriedUnitMovementType.effectMap[fromTile.type]? or 
                  carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)

    for neighbor in neighbors
      toTile = mapArray[neighbor.y][neighbor.x]
      
      # cannot unload to tile with unit, unless the tile is the carrier unit's origin tile
      # and the carrier moves away from that tile on the same turn
      continue if toTile.unit? and not ((x1 isnt x2 or y1 isnt y2) and (neighbor.x is x1 and neighbor.y is y1))
      return true if (toTile.type not of carriedUnitMovementType.effectMap) or 
                     (carriedUnitMovementType.effectMap[toTile.type]? and 
                      carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)
  false

GameLogic::unitUnloadOptions = (x1, y1, x2, y2) ->
  mapArray = @map.getMapArray()
  tile = mapArray[y1][x1]
  unit = tile.unit
  return []  if unit.carriedUnits.length is 0
  fromTile = mapArray[y2][x2]
  neighbors = @getNeighborTiles(mapArray, fromTile.x, fromTile.y)
  unloadOptions = []

  for carriedUnit in unit.carriedUnits
    carriedUnitType = @rules.units[carriedUnit.type]
    carriedUnitMovementType = @rules.movementTypes[carriedUnitType.movementType]
    continue  if fromTile.type of carriedUnitMovementType.effectMap and 
                 (not carriedUnitMovementType.effectMap[fromTile.type]? or 
                  carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)

    for neighbor in neighbors
      toTile = mapArray[neighbor.y][neighbor.x]
      
      # cannot unload to tile with unit, unless the tile is the carrier unit's origin tile
      # and the carrier moves away from that tile on the same turn
      continue  if toTile.unit? and not ((x1 isnt x2 or y1 isnt y2) and (neighbor.x is x1 and neighbor.y is y1))
      
      if (toTile.type not of carriedUnitMovementType.effectMap) or 
         (carriedUnitMovementType.effectMap[toTile.type]? and 
          carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)
        unloadOptions.push carriedUnit
        break
        
  return unloadOptions

GameLogic::unitUnloadTargetOptions = (x1, y1, x2, y2, unitId) ->
  mapArray = @map.getMapArray()
  tile = mapArray[y1][x1]
  unit = tile.unit
  return []  if unit.carriedUnits.length is 0
  fromTile = mapArray[y2][x2]
  neighbors = @getNeighborTiles(mapArray, fromTile.x, fromTile.y)
  unloadOptions = []
  carriedUnit = null
  carriedUnitType = null
  carriedUnitMovementType = null

  for cu in unit.carriedUnits
    if cu.unitId is unitId
      carriedUnit = cu
      carriedUnitType = @rules.units[carriedUnit.type]
      carriedUnitMovementType = @rules.movementTypes[carriedUnitType.movementType]

  return null  if carriedUnit is null
  return null  if fromTile.type of carriedUnitMovementType.effectMap and 
                  (carriedUnitMovementType.effectMap[fromTile.type] is null or 
                   carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)

  for neighbor in neighbors
    toTile = mapArray[neighbor.y][neighbor.x]
    
    # cannot unload to tile with unit, unless the tile is the carrier unit's origin tile
    # and the carrier moves away from that tile on the same turn
    continue  if toTile.unit? and 
                 ((x1 is x2 and y1 is y2) or
                  (neighbor.x isnt x1 or neighbor.y isnt y1))
                      
    unloadOptions.push neighbor  if (toTile.type not of carriedUnitMovementType.effectMap) or 
                                    (carriedUnitMovementType.effectMap[toTile.type] isnt null and 
                                     carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)
    
  return unloadOptions

GameLogic::getPowerMap = ->
  mapArray = @map.getMapArray()
  powerMap =
    tiles: []
    maxValue: 0

  for y of mapArray
    powerMap.tiles.push []
    for x of mapArray[y]
      powerMap.tiles[y].push
        maxValue: 0
        maxValuePlayer: 0
        values: {}

  for y of mapArray
    y = parseInt(y)
    for x of mapArray[y]
      x = parseInt(x)
      unit = mapArray[y][x].unit
      continue  unless unit?
      unitType = @rules.units[unit.type]
      movementOptions = @unitMovementOptions(x, y)
      continue  unless movementOptions?
      influenceTiles = []
      influenceDivisor = 0
      for mi of movementOptions
        movementOption = movementOptions[mi]
        attackOptions = []
        for ty of mapArray
          ty = parseInt(ty)
          for tx of mapArray[ty]
            tx = parseInt(tx)
            distance = @getDistance(movementOption.pos.x, movementOption.pos.y, tx, ty)
            if (unitType.primaryWeapon? and 
                (not @rules.weapons[unitType.primaryWeapon].requireDeployed or unit.deployed) and 
                 distance of @rules.weapons[unitType.primaryWeapon].rangeMap) or 
               (unitType.secondaryWeapon? and 
                (not @rules.weapons[unitType.secondaryWeapon].requireDeployed or unit.deployed) and 
                 distance of @rules.weapons[unitType.secondaryWeapon].rangeMap)
              attackOptions.push
                x: tx
                y: ty

        for ai of attackOptions
          influenceDivisor += 1
          attackOption = attackOptions[ai]
          newTile = true
          for ii of influenceTiles
            influenceTile = influenceTiles[ii]
            if influenceTile.pos.x is attackOption.x and influenceTile.pos.y is attackOption.y
              influenceTile.n += 1
              newTile = false
          if newTile
            influenceTiles.push
              pos:
                x: attackOption.x
                y: attackOption.y
              n: 1

      for ii of influenceTiles
        influenceTile = influenceTiles[ii]
        powerMapTile = powerMap.tiles[influenceTile.pos.y][influenceTile.pos.x]
        powerMapTile.values[unit.owner] = 0.0  unless unit.owner of powerMapTile.values
        influence = unit.health * influenceTile.n * unitType.price / influenceDivisor / 100
        powerMapTile.values[unit.owner] += influence
        if powerMapTile.values[unit.owner] > powerMapTile.maxValue
          powerMapTile.maxValue = powerMapTile.values[unit.owner]
          powerMapTile.maxValuePlayer = unit.owner
          powerMap.maxValue = powerMapTile.values[unit.owner]  if powerMapTile.values[unit.owner] > powerMap.maxValue
        else if powerMapTile.values[unit.owner] is powerMapTile.maxValue and unit.owner isnt powerMapTile.maxValuePlayer
          powerMapTile.maxValue = powerMapTile.values[unit.owner]
          powerMapTile.maxValuePlayer = 0
          
  return powerMap
