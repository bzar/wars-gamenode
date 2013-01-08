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
  i = 0

  for a in adjacent
    neighbors.push a if mapArray[a.y] and mapArray[a.y][a.x]
    
  neighbors

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
  distance

GameLogic::tileHasMovableUnit = (player, x, y) ->
  tile = @map.getTile(x, y)
  if not tile or not tile.unit
    return false
  else unless tile.unit.owner is player
    return false
  else return false  if tile.unit.moved
  true

GameLogic::tileCanBuild = (player, x, y) ->
  tile = @map.getTile(x, y)
  if not tile or tile.owner isnt player
    return false
  else if tile.unit
    return false
  else return false  if @rules.terrains[tile.type].buildTypes.length is 0
  true

GameLogic::tileBuildOptions = (x, y) ->
  tile = @map.getTile(x, y)
  terrain = @rules.terrains[tile.type]
  buildOptions = []
  for i of @rules.units
    unitType = @rules.units[i]
    canBuild = false
    for j of terrain.buildTypes
      if terrain.buildTypes[j] is unitType.unitClass
        canBuild = true
        break
    continue  unless canBuild
    banned = false
    for k of @rules.bannedUnits
      if @rules.bannedUnits[k] is unitType.id
        banned = true
        break
    buildOptions.push unitType  unless banned
  buildOptions

GameLogic::unitCanMovePath = (x, y, dx, dy, path) ->
  mapArray = @map.getMapArray()
  unit = mapArray[y][x].unit
  if unit is null
    console.log "no unit at (" + x + ", " + y + ")"
    return false
  unitType = @rules.units[unit.type]
  return false  if unit.deployed and (x isnt dx or y isnt dy)
  unitMovementType = @rules.movementTypes[unitType.movementType]
  left = unitType.movement
  i = 1

  while i < path.length
    node = path[i]
    tile = mapArray[node.y][node.x]
    
    # Reject if does not exist
    return false  if tile is `undefined`
    
    # Reject if tile has an enemy unit
    return false  if tile.unit isnt null and tile.unit.owner isnt unit.owner
    
    # Determine cost
    cost = 1
    cost = unitMovementType.effectMap[tile.type]  if tile.type of unitMovementType.effectMap
    
    # Reject if cannot move on terrain or cost is too high
    return false  if not cost? or cost > left
    left -= cost
    ++i
  true

GameLogic::unitCanMoveTo = (x, y, dx, dy) ->
  addNode = (node) ->
    isBefore = (a, b) ->
      if a.left > b.left
        true
      else if a.left is b.left and a.distance < b.distance
        true
      else
        false
    if next is null or isBefore(node, next)
      node.next = next
      next = node
    else
      pos = next
      pos = pos.next  while pos.next isnt null and isBefore(pos.next, node)
      node.next = pos.next
      pos.next = node
  mapArray = @map.getMapArray()
  unit = mapArray[y][x].unit
  if unit is null
    console.log "no unit at (" + x + ", " + y + ")"
    return null
  unitType = @rules.units[unit.type]
  return false  if unit.deployed and (x isnt dx or y isnt dy)
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
    from[current.tile.y] = {}  if from[current.tile.y] is `undefined`
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
    i = 0

    while i < neighbors.length
      tile = mapArray[neighbors[i].y][neighbors[i].x]
      
      # Reject if does not exist
      continue  if tile is `undefined`
      
      # Reject if visited
      continue  if from[tile.y] isnt `undefined` and from[tile.y][tile.x] isnt `undefined`
      
      # Reject if tile has an enemy unit
      continue  if tile.unit isnt null and tile.unit.owner isnt unit.owner
      
      # Determine cost
      cost = 1
      cost = unitMovementType.effectMap[tile.type]  if tile.type of unitMovementType.effectMap
      
      # Reject if cannot move on terrain or cost is too high
      continue  if not cost? or cost > current.left
      
      # Search list for existing node for same tile
      previous = null
      existing = next
      while existing isnt null and (existing.tile.x isnt tile.x or existing.tile.y isnt tile.y)
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
        addNode node
      else
        
        # Otherwise if new route is cheaper, remove the old node and add the new one
        if existing.left < node.left
          if previous is null
            next = existing.next
          else
            previous.next = existing.next
          existing.next = null
          addNode node
      ++i
  false

GameLogic::getPath = (movementTypeId, playerNumber, x, y, dx, dy, maxCostPerNode, maxCost, acceptNextTo) ->
  addNode = (node) ->
    isBefore = (a, b) ->
      if a.cost < b.cost
        true
      else if a.cost is b.cost and a.distance < b.distance
        true
      else
        false
    if next is null or isBefore(node, next)
      node.next = next
      next = node
    else
      pos = next
      pos = pos.next  while pos.next isnt null and isBefore(pos.next, node)
      node.next = pos.next
      pos.next = node
  mapArray = @map.getMapArray()
  unitMovementType = @rules.movementTypes[movementTypeId]
  from = {}
  next =
    tile: mapArray[y][x]
    cost: 0
    next: null
    from: null
    distance: @getDistance(x, y, dx, dy)

  while next isnt null
    
    # Take the next best node from list
    current = next
    next = current.next
    
    # Add node as visited
    from[current.tile.y] = {}  if from[current.tile.y] is `undefined`
    from[current.tile.y][current.tile.x] = current.from
    
    # Check end condition
    if (if @getDistance(current.tile.x, current.tile.y, dx, dy) <= acceptNextTo then 1 else 0)
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
    i = 0

    while i < neighbors.length
      tile = mapArray[neighbors[i].y][neighbors[i].x]
      
      # Reject if does not exist
      continue  if tile is `undefined`
      
      # Reject if visited
      continue  if from[tile.y] isnt `undefined` and from[tile.y][tile.x] isnt `undefined`
      
      # Reject if tile has an enemy unit
      continue  if tile.unit isnt null and tile.unit.owner isnt playerNumber
      
      # Determine cost
      cost = 1
      cost = unitMovementType.effectMap[tile.type]  if tile.type of unitMovementType.effectMap
      continue  if cost is null or (maxCostPerNode isnt `undefined` and maxCostPerNode < cost) or (maxCost isnt `undefined` and maxCost < cost + current.cost)
      
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

      if existing is null
        
        # If node points to a new tile, add node to the list
        addNode node
      else
        
        # Otherwise if new route is cheaper, remove the old node and add the new one
        if existing.cost > node.cost
          if previous is null
            next = existing.next
          else
            previous.next = existing.next
          existing.next = null
          addNode node
      ++i
  false

GameLogic::unitMovementOptions = (x, y) ->
  mapArray = @map.getMapArray()
  unit = mapArray[y][x].unit
  return null  if unit is `undefined`
  unitType = @rules.units[unit.type]
  if unit.deployed
    return [
      pos:
        x: x
        y: y

      prev: null
      n: unitType.movement
    ]
  unitMovementType = @rules.movementTypes[unitType.movementType]
  movementOptions = []
  destinationOptions = []
  bfsQueue = [
    pos:
      x: x
      y: y

    prev: null
    n: unitType.movement
  ]
  until bfsQueue.length is 0
    node = bfsQueue.shift()
    addNode = true
    nodeIndex = `undefined`
    oldNodeLongerPath = false
    i = 0

    while i < movementOptions.length
      option = movementOptions[i]
      if option.pos.x is node.pos.x and option.pos.y is node.pos.y
        if option.n < node.n
          nodeIndex = i
        else
          oldNodeLongerPath = true
        break
      ++i
    continue  if oldNodeLongerPath
    targetTile = mapArray[node.pos.y][node.pos.x]
    addNode = false  if targetTile.unit and (node.pos.x isnt x or node.pos.y isnt y) and not @unitCanLoadInto(x, y, node.pos.x, node.pos.y)
    if addNode
      destinationIndex = `undefined`
      i = 0

      while i < destinationOptions.length
        option = destinationOptions[i]
        if option.pos.x is node.pos.x and option.pos.y is node.pos.y
          destinationIndex = i
          break
        ++i
      if destinationIndex is `undefined`
        destinationOptions.push node
      else
        destinationOptions[i] = node
    if nodeIndex is `undefined`
      movementOptions.push node
    else
      movementOptions[i] = node
    continue  if node.n is 0
    neighbors = @getNeighborTiles(mapArray, node.pos.x, node.pos.y)

    for neighbor in neighbors
      continue  if node.prev isnt null and neighbor.x is node.prev.pos.x and neighbor.y is node.prev.pos.y
      tile = mapArray[neighbor.y][neighbor.x]
      cost = 1
      cost = unitMovementType.effectMap[tile.type]  if tile.type of unitMovementType.effectMap
      continue  unless cost?
      continue  if cost > node.n
      continue  unless tile.unit.owner is unit.owner  if tile.unit?
      newNode =
        pos:
          x: neighbor.x
          y: neighbor.y

        prev: node
        n: node.n - cost

      bfsQueue.push newNode
  destinationOptions

GameLogic::calculateAttackPower = (unit, distance, targetArmor) ->
  unitType = @rules.units[unit.type]
  primaryPower = null
  secondaryPower = null
  primaryWeapon = @rules.weapons[unitType.primaryWeapon]
  secondaryWeapon = @rules.weapons[unitType.secondaryWeapon]
  primaryPower = parseInt(primaryWeapon.rangeMap[distance] * primaryWeapon.powerMap[targetArmor.id] / 100)  if primaryWeapon? and distance of primaryWeapon.rangeMap and targetArmor.id of primaryWeapon.powerMap and (not primaryWeapon.requireDeployed or unit.deployed)
  secondaryPower = parseInt(secondaryWeapon.rangeMap[distance] * secondaryWeapon.powerMap[targetArmor.id] / 100)  if secondaryWeapon? and distance of secondaryWeapon.rangeMap and targetArmor.id of secondaryWeapon.powerMap and (not secondaryWeapon.requireDeployed or unit.deployed)
  weaponPower = null
  unless primaryPower?
    weaponPower = secondaryPower
  else unless secondaryPower?
    weaponPower = primaryPower
  else
    weaponPower = Math.max(primaryPower, secondaryPower)
  weaponPower

GameLogic::calculateDamage = (unit, unitTile, target, targetTile) ->
  targetUnitType = @rules.units[target.type]
  targetArmor = @rules.armors[targetUnitType.armor]
  distance = @getDistance(targetTile.x, targetTile.y, unitTile.x, unitTile.y)
  weaponPower = @calculateAttackPower(unit, distance, targetArmor)
  return null  unless weaponPower?
  targetTileType = @rules.terrains[targetTile.type]
  targetDefense = targetTileType.defense
  targetDefense = targetUnitType.defenseMap[targetTile.type]  if targetTile.type of targetUnitType.defenseMap
  power = parseInt(unit.health * weaponPower * parseInt(100 - targetDefense * target.health / 100) / 100 / 100)
  power = 1  if power is 0
  power

GameLogic::unitAttackOptions = (x1, y1, x2, y2) ->
  attackOptions = []
  tile = @map.getTile(x1, y1)
  attackFromTile = @map.getTile(x2, y2)
  unit = tile.unit
  return null  if unit is `undefined`
  unitType = @rules.units[unit.type]
  mapArray = @map.getMapArray()
  for ty of mapArray
    for tx of mapArray[ty]
      targetTile = mapArray[ty][tx]
      continue  unless targetTile.unit?
      targetUnit = targetTile.unit
      continue  if targetUnit.owner is unit.owner
      power = @calculateDamage(unit, attackFromTile, targetUnit, targetTile)
      if power isnt null
        attackOptions.push
          pos:
            x: tx
            y: ty

          power: power

  attackOptions

GameLogic::unitCanCapture = (x1, y1, x2, y2) ->
  tile = @map.getTile(x1, y1)
  unit = tile.unit
  unitType = @rules.units[unit.type]
  targetTile = @map.getTile(x2, y2)
  targetTileType = @rules.terrains[targetTile.type]
  return false  if targetTile.owner is unit.owner
  capturable = false
  i = 0

  while i < targetTileType.flags.length
    flag = @rules.terrainFlags[targetTileType.flags[i]]
    if flag.name is "Capturable"
      capturable = true
      break
    ++i
  return false  unless capturable
  i = 0

  while i < unitType.flags.length
    flag = @rules.unitFlags[unitType.flags[i]]
    return true  if flag.name is "Capture"
    ++i
  false

GameLogic::unitCanWait = (x1, y1, x2, y2) ->
  targetTile = @map.getTile(x2, y2)
  return false  if targetTile.unit? and (x1 isnt x2 or y1 isnt y2)
  true

GameLogic::unitCanDeploy = (x1, y1, x2, y2) ->
  tile = @map.getTile(x1, y1)
  unit = tile.unit
  return false  if unit.deployed
  targetTile = @map.getTile(x2, y2)
  return false  if targetTile.unit? and (x1 isnt x2 or y1 isnt y2)
  unitType = @rules.units[unit.type]
  return true  if (unitType.primaryWeapon? and @rules.weapons[unitType.primaryWeapon].requireDeployed) or (unitType.secondaryWeapon? and @rules.weapons[unitType.secondaryWeapon].requireDeployed)
  false

GameLogic::unitCanUndeploy = (x, y) ->
  tile = @map.getTile(x, y)
  unit = tile.unit
  return true  if unit.deployed
  false

GameLogic::unitCanLoadInto = (x1, y1, x2, y2) ->
  tile = @map.getTile(x1, y1)
  unit = tile.unit
  unitType = @rules.units[unit.type]
  targetTile = @map.getTile(x2, y2)
  otherUnit = targetTile.unit
  return false  if not otherUnit? or otherUnit.unitId is unit.unitId
  otherUnitType = @rules.units[otherUnit.type]
  return true  if otherUnit.owner is unit.owner and otherUnit.carriedUnits.length < otherUnitType.carryNum and unitType.unitClass of otherUnitType.carryClasses
  false

GameLogic::unitCanUnload = (x1, y1, x2, y2) ->
  mapArray = @map.getMapArray()
  tile = mapArray[y1][x1]
  unit = tile.unit
  return false  if unit.carriedUnits is `undefined` or unit.carriedUnits.length is 0
  fromTile = mapArray[y2][x2]
  neighbors = @getNeighborTiles(mapArray, fromTile.x, fromTile.y)
  j = 0

  while j < unit.carriedUnits.length
    carriedUnit = unit.carriedUnits[j]
    carriedUnitType = @rules.units[carriedUnit.type]
    carriedUnitMovementType = @rules.movementTypes[carriedUnitType.movementType]
    continue  if fromTile.type of carriedUnitMovementType.effectMap and (not carriedUnitMovementType.effectMap[fromTile.type]? or carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)
    i = 0

    while i < neighbors.length
      neighbor = neighbors[i]
      toTile = mapArray[neighbor.y][neighbor.x]
      
      # cannot unload to tile with unit, unless the tile is the carrier unit's origin tile
      # and the carrier moves away from that tile on the same turn
      continue  if toTile.unit? and not ((x1 isnt x2 or y1 isnt y2) and (neighbor.x is x1 and neighbor.y is y1))
      return true  if (toTile.type not of carriedUnitMovementType.effectMap) or (carriedUnitMovementType.effectMap[toTile.type]? and carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)
      ++i
    ++j
  false

GameLogic::unitUnloadOptions = (x1, y1, x2, y2) ->
  mapArray = @map.getMapArray()
  tile = mapArray[y1][x1]
  unit = tile.unit
  return []  if unit.carriedUnits.length is 0
  fromTile = mapArray[y2][x2]
  neighbors = @getNeighborTiles(mapArray, fromTile.x, fromTile.y)
  unloadOptions = []
  j = 0

  while j < unit.carriedUnits.length
    carriedUnit = unit.carriedUnits[j]
    carriedUnitType = @rules.units[carriedUnit.type]
    carriedUnitMovementType = @rules.movementTypes[carriedUnitType.movementType]
    continue  if fromTile.type of carriedUnitMovementType.effectMap and (not carriedUnitMovementType.effectMap[fromTile.type]? or carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)
    i = 0

    while i < neighbors.length
      neighbor = neighbors[i]
      toTile = mapArray[neighbor.y][neighbor.x]
      
      # cannot unload to tile with unit, unless the tile is the carrier unit's origin tile
      # and the carrier moves away from that tile on the same turn
      continue  if toTile.unit? and not ((x1 isnt x2 or y1 isnt y2) and (neighbor.x is x1 and neighbor.y is y1))
      if (toTile.type not of carriedUnitMovementType.effectMap) or (carriedUnitMovementType.effectMap[toTile.type]? and carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)
        unloadOptions.push carriedUnit
        break
      ++i
    ++j
  unloadOptions

GameLogic::unitUnloadTargetOptions = (x1, y1, x2, y2, unitId) ->
  mapArray = @map.getMapArray()
  tile = mapArray[y1][x1]
  unit = tile.unit
  return []  if unit.carriedUnits.length is 0
  fromTile = mapArray[y2][x2]
  neighbors = @getNeighborTiles(mapArray, fromTile.x, fromTile.y)
  unloadOptions = []
  carriedUnit = `undefined`
  carriedUnitType = `undefined`
  carriedUnitMovementType = `undefined`
  i = 0

  while i < unit.carriedUnits.length
    if unit.carriedUnits[i].unitId is unitId
      carriedUnit = unit.carriedUnits[i]
      carriedUnitType = @rules.units[carriedUnit.type]
      carriedUnitMovementType = @rules.movementTypes[carriedUnitType.movementType]
    ++i
  return null  if carriedUnit is `undefined`
  return null  if fromTile.type of carriedUnitMovementType.effectMap and (not carriedUnitMovementType.effectMap[fromTile.type]? or carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)
  i = 0

  while i < neighbors.length
    neighbor = neighbors[i]
    toTile = mapArray[neighbor.y][neighbor.x]
    
    # cannot unload to tile with unit, unless the tile is the carrier unit's origin tile
    # and the carrier moves away from that tile on the same turn
    continue  if toTile.unit? and not ((x1 isnt x2 or y1 isnt y2) and (neighbor.x is x1 and neighbor.y is y1))
    unloadOptions.push neighbor  if (toTile.type not of carriedUnitMovementType.effectMap) or (carriedUnitMovementType.effectMap[toTile.type]? and carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)
    ++i
  unloadOptions

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
            if (unitType.primaryWeapon? and (not @rules.weapons[unitType.primaryWeapon].requireDeployed or unit.deployed) and distance of @rules.weapons[unitType.primaryWeapon].rangeMap) or (unitType.secondaryWeapon? and (not @rules.weapons[unitType.secondaryWeapon].requireDeployed or unit.deployed) and distance of @rules.weapons[unitType.secondaryWeapon].rangeMap)
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
  powerMap
