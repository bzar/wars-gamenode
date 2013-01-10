define ["Theme", "lib/aja/lib/aja", "lib/pixastic", "lib/sylvester"], (Theme) ->
  class AnimatedMap 
    constructor: (canvasId, scale, theme, rules) ->
      @theme = (if theme then theme else new Theme("pixel"))
      @autoscale = not scale
      @scale = scale
      @canvas = new aja.Canvas(canvasId)
      @canvas.verbosity = 1
      @overlay = new Overlay(this)
      @overlay.z = 100
      @canvas.addEntity @overlay
      @overlay.visible = false
      @animationSpeed = 1.0
      @animate = true
      @canvas.renderOrder = (a, b) ->
        if not a.z?
          if not b.z?
            (a.y + a.x / 2) - (b.y + b.x / 2)
          else
            -b.z
        else
          if not b.z?
            a.z
          else
            a.z - b.z

      @xAxis = $V([@theme.settings.hex.width - @theme.settings.hex.triWidth, @theme.settings.hex.height / 2])
      @yAxis = $V([0, @theme.settings.hex.height])
      @origin = $V([0, @theme.settings.image.height - @theme.settings.hex.height])
      @tiles = null
      @sprites = null
      @rules = rules
      @powerMap = null
      @showPowerMap = false
      @showBorders = false
      @showGrid = false
      @unitEntities = {}
      
  AnimatedMap.PHASE_SELECT = 1
  AnimatedMap.PHASE_MOVE = 2
  AnimatedMap.PHASE_ATTACK = 3
  AnimatedMap.PHASE_BUILD = 4
  AnimatedMap.PHASE_ACTION = 5
  AnimatedMap.PHASE_UNLOAD = 5
      
  AnimatedMap::hex2rectCoords = (hx, hy) ->
    p = (if hy isnt `undefined` then $V([hx, hy]) else hx)
    p = @xAxis.multiply(p.e(1)).add(@yAxis.multiply(p.e(2)))
    p = p.add(@origin)
    p

  AnimatedMap::rect2hexCoords = (rx, ry) ->
    p = (if ry isnt `undefined` then $V([rx, ry]) else rx)
    p = p.subtract(@origin)
    origin = $M([[1, 0, -@theme.settings.hex.width / 2], [0, 1, -@theme.settings.hex.height / 2], [0, 0, 1]])
    mat = $M([[@xAxis.e(1), @yAxis.e(1), 0], [@xAxis.e(2), @yAxis.e(2), 0], [0, 0, 1]]).inv()
    mat.multiply(origin.multiply($V([p.e(1), p.e(2), 1]))).round()

  AnimatedMap::getScale = ->
    if @autoscale
      mapSize = @getMapDimensions()
      horScale = @canvas.width / mapSize.e(1)
      verScale = @canvas.height / mapSize.e(2)
      @scale = (if horScale < verScale then horScale else verScale)
    @scale

  AnimatedMap::getOffset = ->
    if @autoscale
      mapSize = @getMapDimensions()
      xOffset = (if mapSize.w < mapSize.h then (mapSize.h - mapSize.w) / 2 else 0)
      yOffset = (if mapSize.w > mapSize.h then (mapSize.w - mapSize.h) / 2 else 0)
      $V [xOffset, yOffset]
    else
      $V [0, 0]

  AnimatedMap::doPreload = (callback) ->
    @sprites = new Image()
    @spritesMoved = new Image()
    @spritesAttack = new Image()
    sprites = @sprites
    spritesMoved = @spritesMoved
    spritesAttack = @spritesAttack
    @sprites.src = @theme.getSpriteSheetUrl()
    that = this
    sprites.onload = ->
      spritesMoved.src = sprites.src
      spritesMoved.onload = ->
        Pixastic.process spritesMoved, "hsl",
          hue: 0
          saturation: -30
          lightness: -30
        , (img) ->
          that.spritesMoved = img
          spritesAttack.src = sprites.src
          spritesAttack.onload = ->
            Pixastic.process spritesAttack, "coloradjust",
              red: 1.0
              green: -0.2
              blue: -0.2
            , (img) ->
              that.spritesAttack = img
              callback()



  AnimatedMap::getMapLimits = ->
    min = null
    max = null
    @tiles.forEach (tile) ->
      if min is null
        min = $V([tile.x, tile.y])
        max = $V([tile.x, tile.y])
      else
        min = $V([(if tile.x < min.e(1) then tile.x else min.e(1)), (if tile.y < min.e(2) then tile.y else min.e(2))])
        max = $V([(if tile.x > max.e(1) then tile.x else max.e(1)), (if tile.y > max.e(2) then tile.y else max.e(2))])

    min: min
    max: max

  AnimatedMap::getMapSize = ->
    size = @getMapLimits()
    size.max.subtract size.min

  AnimatedMap::getMapDimensions = ->
    size = @getMapLimits().max
    w = @hex2rectCoords(size.e(1) + 1, 0).e(1)
    h = @hex2rectCoords(0, size.e(2) + 1).e(2)
    rectSize = $V([w, h]).add($V([@theme.settings.hex.triWidth + @origin.e(1), @origin.e(2)]))
    rectSize

  AnimatedMap::getTile = (x, y) ->
    if x isnt `undefined` and y isnt `undefined`
      @tiles.filter((d) ->
        true  if d.x is x and d.y is y
      )[0]
    else if x isnt `undefined`
      tiles = @tiles.filter((tile) ->
        tile.tileId is x
      )
      (if tiles.length isnt 0 then tiles[0] else null)
    else
      null

  AnimatedMap::clear = ->
    @canvas.ctx.clearRect 0, 0, @canvas.canvas.width, @canvas.canvas.height

  AnimatedMap::_drawHex = (ctx, tileType, tileSubtype, tileOwner, x, y, sheet) ->
    imageCoords = @theme.getTileCoordinates(tileType, tileSubtype, tileOwner)
    ctx.drawImage (if sheet then sheet else @sprites), imageCoords.x, imageCoords.y, @theme.settings.image.width, @theme.settings.image.height, x, y, @theme.settings.image.width, @theme.settings.image.height

  AnimatedMap::_drawProp = (ctx, tileType, tileSubtype, tileOwner, x, y, sheet) ->
    imageCoords = @theme.getTilePropCoordinates(tileType, tileSubtype, tileOwner)
    return  if imageCoords is null
    ctx.drawImage (if sheet then sheet else @sprites), imageCoords.x, imageCoords.y, @theme.settings.image.width, @theme.settings.image.height, x, y, @theme.settings.image.width, @theme.settings.image.height

  AnimatedMap::_drawPropOnHex = (ctx, tileType, tileSubtype, tileOwner, x, y, sheet) ->
    @_drawProp ctx, tileType, tileSubtype, tileOwner, x, y - (@theme.settings.image.height - @theme.settings.hex.height), sheet

  AnimatedMap::_redrawTerrain = (ctx, redrawFunc) ->
    i = 0

    while i < @tiles.length
      tile = @tiles[i]
      if tile
        r = @hex2rectCoords(tile.x, tile.y)
        offset = @theme.getTileOffset(tile.type, tile.subtype, tile.owner)
        if redrawFunc
          redrawFunc ctx, tile, r, offset
        else
          @_drawHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset
          @_drawPropOnHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset
      ++i

  AnimatedMap::paintMovementMask = (movementOptions) ->
    ctx = @canvas.background.getContext("2d")
    @_redrawTerrain ctx, (ctx, tile, r, offset) =>
      sheet = @spritesMoved
      i = 0

      while i < movementOptions.length
        if movementOptions[i].pos.x is tile.x and movementOptions[i].pos.y is tile.y
          sheet = null
          break
        ++i
      @_drawHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet
      @_drawPropOnHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet

    @canvas.forceRedraw()

  AnimatedMap::paintUnloadMask = (unloadOptions) ->
    ctx = @canvas.background.getContext("2d")
    @_redrawTerrain ctx, (ctx, tile, r, offset) =>
      sheet = @spritesMoved

      for option in unloadOptions
        if parseInt(option.x) is tile.x and parseInt(option.y) is tile.y
          sheet = null
          break
      @_drawHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet
      @_drawPropOnHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet

    @canvas.forceRedraw()

  AnimatedMap::paintAttackMask = (attackOptions) ->
    ctx = @canvas.background.getContext("2d")
    @_redrawTerrain ctx, (ctx, tile, r, offset) =>
      sheet = null

      for option in attackOptions
        if parseInt(option.pos.x) is tile.x and parseInt(option.pos.y) is tile.y
          sheet = @spritesAttack
          break
      @_drawHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet
      @_drawPropOnHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset, sheet

    octx = @overlay.canvas.getContext("2d")
    octx.clearRect 0, 0, octx.canvas.width, octx.canvas.height

    for opt in attackOptions
      damageString = "" + opt.power
      coord = @hex2rectCoords(opt.pos.x, opt.pos.y)
      i = 0

      while i < damageString.length
        n = damageString[i]
        numCoord = @theme.getDamageNumberCoordinates(n)
        octx.drawImage @sprites, numCoord.x, numCoord.y, @theme.settings.image.width, @theme.settings.image.height, coord.e(1) - ((damageString.length - 1) / 2 - i) * (@theme.settings.number.width + 1), coord.e(2) - (@theme.settings.image.height - @theme.settings.hex.height), @theme.settings.image.width, @theme.settings.image.height
        ++i
    @overlay.visible = true
    @canvas.forceRedraw()

  AnimatedMap::sortTilesToRenderOrder = ->
    @tiles.sort (a, b) ->
      if a.y isnt b.y
        a.y - b.y
      else
        a.x - b.x


  AnimatedMap::refresh = ->
    @sortTilesToRenderOrder()
    @clear()
    unless @autoscale
      mapSize = @getMapDimensions()
      @canvas.width = mapSize.e(1)
      @canvas.height = mapSize.e(2)
    ctx = @canvas.background.getContext("2d")
    ctx.fillStyle = "#eee"
    ctx.fillRect 0, 0, @canvas.canvas.width, @canvas.canvas.height
    @_redrawTerrain ctx
    if @powerMap?
      @paintPowerMap @powerMap  if @showPowerMap
      @paintBorders @powerMap  if @showBorders
    @paintGrid()  if @showGrid
    @canvas.forceRedraw()

  AnimatedMap::coordToTile = (cx, cy) ->
    offset = @getOffset()
    scale = @getScale()
    @rect2hexCoords (cx - offset.e(1)) / scale, (cy - offset.e(2)) / scale

  AnimatedMap::hideOverlay = ->
    @overlay.visible = false
    @canvas.forceRedraw()

  AnimatedMap::eventToTile = (event) ->
    cx = event.pageX - $(@canvas).offset().left
    cy = event.pageY - $(@canvas).offset().top
    coordToTile cx, cy

  AnimatedMap::eventToTileX = (event) ->
    @eventToTile(event).e 1

  AnimatedMap::eventToTileY = (event) ->
    @eventToTile(event).e 2

  AnimatedMap::capturedPercentage = (el) ->
    el.capturePoints / 200

  AnimatedMap::resize = (width, height) ->
    @canvas.resize width, height
    @overlay.resize width, height

  AnimatedMap::paintDamageIndicators = (attacks) ->
    mapSize = @getMapSize()
    ctx = @overlay.canvas.getContext("2d")
    ctx.scale @getScale(), @getScale()
    for attack in attacks
      power = attack.power
      ctx.fillStyle = "#fff"
      ctx.strokeStyle = "#555"
      ctx.lineWidth = 1
      ctx.font = "15px sans-serif"
      ctx.textBaseline = "top"
      ctx.strokeText power + "%", attack.pos.x * @tileW + 2, attack.pos.y * @tileH + 2 - @unitOffsetY
      ctx.fillText power + "%", attack.pos.x * @tileW + 2, attack.pos.y * @tileH + 2 - @unitOffsetY
    @canvas.forceRedraw()

  AnimatedMap::tileWithUnit = (unitId) ->
    tiles = @tiles.filter (tile) ->
      tile.unit isnt null and tile.unit.unitId is unitId
    
    (if tiles.length isnt 0 then tiles[0] else null)

  AnimatedMap::getMapArray = ->
    mapArray = {}
    @tiles.forEach (tile) ->
      mapArray[tile.y] = {}  if mapArray[tile.y] is `undefined`
      mapArray[tile.y][tile.x] = tile

    mapArray

  AnimatedMap::interpolateColor = (baseColor, targetColor, scalar) ->
    color =
      r: baseColor.r + scalar * (targetColor.r - baseColor.r)
      g: baseColor.g + scalar * (targetColor.g - baseColor.g)
      b: baseColor.b + scalar * (targetColor.b - baseColor.b)

    color

  AnimatedMap::paintPowerMap = (powerMap) ->
    ctx = @canvas.background.getContext("2d")
    ctx.save()
    ctx.globalAlpha = 0.8
    neutralColor = @theme.getPlayerColor(0)
    for y of powerMap.tiles
      for x of powerMap.tiles[y]
        y = parseInt(y)
        x = parseInt(x)
        maxValuePlayer = powerMap.tiles[y][x].maxValuePlayer
        playerColor = @theme.getPlayerColor(maxValuePlayer)
        valueScale = (parseFloat(powerMap.tiles[y][x].maxValue) / parseFloat(powerMap.maxValue)) / 2 + 0.5
        color = @interpolateColor(neutralColor, playerColor, valueScale)
        ctx.fillStyle = "rgba(" + parseInt(color.r) + "," + parseInt(color.g) + "," + parseInt(color.b) + "," + valueScale + ")"
        @paintMask ctx, x, y
    ctx.restore()
    @canvas.forceRedraw()

  AnimatedMap::paintBorders = (powerMap) ->
    ctx = @canvas.background.getContext("2d")
    ctx.save()
    ctx.globalAlpha = 1.0
    for y of powerMap.tiles
      for x of powerMap.tiles[y]
        y = parseInt(y)
        x = parseInt(x)
        maxValuePlayer = powerMap.tiles[y][x].maxValuePlayer
        continue  if maxValuePlayer is 0
        x1 = x * @tileW
        y1 = y * @tileH - @unitOffsetY
        x2 = (x + 1) * @tileW
        y2 = (y + 1) * @tileH - @unitOffsetY
        color = @theme.getPlayerColorString(maxValuePlayer)
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.beginPath()
        if y > 0 and maxValuePlayer isnt powerMap.tiles[y - 1][x].maxValuePlayer
          ctx.moveTo x1, y1 + 1
          ctx.lineTo x2, y1 + 1
        if x > 0 and maxValuePlayer isnt powerMap.tiles[y][x - 1].maxValuePlayer
          ctx.moveTo x1 + 1, y1
          ctx.lineTo x1 + 1, y2
        if y < powerMap.tiles.length - 1 and maxValuePlayer isnt powerMap.tiles[y + 1][x].maxValuePlayer
          ctx.moveTo x1, y2 - 1
          ctx.lineTo x2, y2 - 1
        if x < powerMap.tiles[y].length - 1 and maxValuePlayer isnt powerMap.tiles[y][x + 1].maxValuePlayer
          ctx.moveTo x2 - 1, y1
          ctx.lineTo x2 - 1, y2
        ctx.stroke()
        ctx.closePath()
    ctx.restore()
    @canvas.forceRedraw()

  AnimatedMap::paintGrid = ->
    ctx = @canvas.background.getContext("2d")
    ctx.save()
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = 1
    ctx.beginPath()
    mapSize = @getMapSize()
    y = 0

    while y < mapSize.h - 1
      ctx.moveTo 0, (y + 1) * @tileH - @unitOffsetY
      ctx.lineTo mapSize.w * @tileW, (y + 1) * @tileH - @unitOffsetY
      ++y
    x = 0

    while x < mapSize.w - 1
      ctx.moveTo (x + 1) * @tileW, -@unitOffsetY
      ctx.lineTo (x + 1) * @tileW, mapSize.h * @tileH - @unitOffsetY
      ++x
    ctx.stroke()
    ctx.restore()
    @canvas.forceRedraw()

  AnimatedMap::initEntities = ->
    that = this
    @tiles.forEach (el) ->
      if el.unit
        unit = new MapUnit(el.unit, el.x, el.y, that)
        unit.healthIndicator = new HealthIndicator(unit)
        that.canvas.addEntity unit
        that.canvas.addEntity unit.healthIndicator
      if el.capturePoints < 200
        el.captureBar = new CaptureBar(el, that)
        that.canvas.addEntity el.captureBar

    @canvas.forceRedraw()

  AnimatedMap::getUnitEntity = (unitId) ->
    i = 0

    while i < @canvas.entities.length
      u = @canvas.entities[i]
      return u  if u.unitId is unitId
      ++i
    null

  AnimatedMap::showMoveUnit = (unitId, path, callback) ->
    u = @getUnitEntity(unitId)
    endPos = u.hexPos(path[path.length - 1].x, path[path.length - 1].y)
    if path.length > 1 and @animate and (u.x isnt endPos.e(1) or u.y isnt endPos.e(2))
      pathSegments = []
      segmentTime = 1000 / (@animationSpeed * path.length)
      i = 1

      while i < path.length
        prev = path[i - 1]
        next = path[i]
        prevPos = u.hexPos(prev.x, prev.y)
        nextPos = u.hexPos(next.x, next.y)
        pathSegments.push new aja.PositionAnimation(u, prevPos.e(1), prevPos.e(2), nextPos.e(1), nextPos.e(2), segmentTime)
        ++i
      @canvas.addAnimation new aja.SequentialAnimation(pathSegments, callback)
    else
      u.x = endPos.e(1)
      u.y = endPos.e(2)
      @canvas.redrawEntity u
      callback?()

  AnimatedMap::moveUnit = (unitId, tileId, path, callback) ->
    that = this
    @showMoveUnit unitId, path, ->
      u = that.getUnitEntity(unitId)
      prevTile = that.getTile(u.tx, u.ty)
      t = that.getTile(tileId)
      prevTile.unit = null
      t.unit = u.unit  if t.unit is null
      that.canvas.eraseEntity u
      u.tx = t.x
      u.ty = t.y
      pos = u.hexPos(t.x, t.y)
      u.x = pos.e(1)
      u.y = pos.e(2)
      that.canvas.drawEntity u
      callback?()


  AnimatedMap::waitUnit = (unitId, callback) ->
    u = @getUnitEntity(unitId)
    u.unit.moved = true
    @canvas.redrawEntity u
    callback?()

  AnimatedMap::showAttack = (unitId, targetId, damage, callback) ->
    doAttack = ->
      target.unit.health -= damage
      canvas.redrawEntities [target, attacker]
      callback?()
    if damage is null
      callback()
      return
    attacker = @getUnitEntity(unitId)
    target = @getUnitEntity(targetId)
    canvas = @canvas
    if attacker isnt null and target isnt null
      if @animate
        va = $V([attacker.x, attacker.y])
        vt = $V([target.x, target.y])
        direction = vt.subtract(va).toUnitVector()
        halfHex = @xAxis.add(@yAxis).multiply(0.5)
        vx = $V([halfHex.e(1) * direction.e(1), halfHex.e(2) * direction.e(2)])
        damageParts = []
        damageString = "" + damage
        numbers = []
        i = 0

        while i < damageString.length
          n = parseInt(damageString[i])
          number = new MapDigit(n, target.x - (damageString.length - i) * @theme.settings.number.width - 2, target.y, this)
          numbers.push number
          @canvas.addEntity number
          parts = []
          parts.push new aja.PauseAnimation(i * 50 / @animationSpeed)
          parts.push new aja.PositionDeltaAnimation(number, 0, -2 * @theme.settings.image.height / 3, 100 / @animationSpeed, aja.easing.QuadOut)
          parts.push new aja.PositionDeltaAnimation(number, 0, 2 * @theme.settings.image.height / 3, 100 / @animationSpeed, aja.easing.QuadIn)
          parts.push new aja.PauseAnimation(200 / @animationSpeed)
          damageParts.push new aja.SequentialAnimation(parts)
          ++i
        damageParts.push new aja.PauseAnimation(500 / @animationSpeed)
        parts = []
        parts.push new aja.PositionDeltaAnimation(attacker, vx.e(1), vx.e(2), 100 / @animationSpeed)
        parts.push new aja.ParallelAnimation(damageParts)
        parts.push new aja.PositionDeltaAnimation(attacker, -vx.e(1), -vx.e(2), 200 / @animationSpeed)
        @canvas.addAnimation new aja.SequentialAnimation(parts, ->
          i = 0

          while i < numbers.length
            canvas.removeEntity numbers[i]
            ++i
          doAttack()
        )
      else
        doAttack()

  AnimatedMap::attackUnit = (unitId, targetId, damage, callback) ->
    attacker = @getUnitEntity(unitId)
    canvas = @canvas
    @showAttack unitId, targetId, damage, ->
      attacker.unit.moved = true
      canvas.redrawEntity attacker
      callback?()


  AnimatedMap::counterattackUnit = (unitId, targetId, damage, callback) ->
    @showAttack unitId, targetId, damage, callback

  AnimatedMap::captureTile = (unitId, tileId, left, callback) ->
    doCapture = ->
      unless t.captureBar
        t.captureBar = new CaptureBar(t, that)
        that.canvas.addEntity t.captureBar
      t.capturePoints = left
      t.beingCaptured = true
      t.captureBar.visible = t.capturePoints < 200
      u.unit.moved = true
      that.refresh()
      callback?()
    u = @getUnitEntity(unitId)
    t = @getTile(tileId)
    that = this
    if @animate
      @canvas.addAnimation new aja.SequentialAnimation([new aja.PositionDeltaAnimation(u, 0, -@theme.settings.hex.height / 2, 100 / @animationSpeed, aja.easing.QuadOut), new aja.PositionDeltaAnimation(u, 0, @theme.settings.hex.height / 2, 100 / @animationSpeed, aja.easing.QuadIn)], doCapture)
    else
      doCapture()

  AnimatedMap::capturedTile = (unitId, tileId, callback) ->
    doCaptured = ->
      unless t.captureBar
        t.captureBar = new CaptureBar(t, that)
        that.canvas.addEntity t.captureBar
      t.capturePoints = 1
      t.beingCaptured = false
      t.captureBar.visible = t.capturePoints < 200
      t.owner = u.unit.owner
      u.unit.moved = true
      that.refresh()
      callback?()
    u = @getUnitEntity(unitId)
    t = @getTile(tileId)
    that = this
    if @animate
      anim = new aja.SequentialAnimation([new aja.PositionDeltaAnimation(u, 0, -@theme.settings.hex.height / 2, 100 / @animationSpeed, aja.easing.QuadOut), new aja.PositionDeltaAnimation(u, 0, @theme.settings.hex.height / 2, 100 / @animationSpeed, aja.easing.QuadIn)], doCaptured)
      anim.loops = 3
      @canvas.addAnimation anim
    else
      doCaptured()

  AnimatedMap::deployUnit = (unitId, callback) ->
    doDeploy = ->
      u.unit.deployed = true
      u.unit.moved = true
      canvas.redrawEntity u
      callback?()
    u = @getUnitEntity(unitId)
    canvas = @canvas
    if @animate
      rumble = new aja.SequentialAnimation([new aja.PositionDeltaAnimation(u, 0, -@theme.settings.hex.height / 8, 20 / @animationSpeed, aja.easing.SineOut), new aja.PositionDeltaAnimation(u, 0, @theme.settings.hex.height / 8, 20 / @animationSpeed, aja.easing.SineIn)])
      rumble.loops = 3
      @canvas.addAnimation new aja.SequentialAnimation([new aja.PositionDeltaAnimation(u, 0, -@theme.settings.hex.height / 2, 100 / @animationSpeed, aja.easing.QuadOut), new aja.PauseAnimation(300 / @animationSpeed), new aja.PositionDeltaAnimation(u, 0, @theme.settings.hex.height / 2, 100 / @animationSpeed, aja.easing.QuadIn), rumble], doDeploy)
    else
      doDeploy()

  AnimatedMap::undeployUnit = (unitId, callback) ->
    doUndeploy = ->
      u.unit.deployed = false
      u.unit.moved = true
      canvas.redrawEntity u
      callback?()
    u = @getUnitEntity(unitId)
    canvas = @canvas
    if @animate
      @canvas.addAnimation new aja.SequentialAnimation([new aja.PositionDeltaAnimation(u, 0, -@theme.settings.hex.height / 4, 50 / @animationSpeed, aja.easing.QuadOut), new aja.PositionDeltaAnimation(u, 0, @theme.settings.hex.height / 4, 50 / @animationSpeed, aja.easing.QuadIn)], doUndeploy)
    else
      doUndeploy()

  AnimatedMap::loadUnit = (unitId, carrierId, callback) ->
    u = @getUnitEntity(unitId)
    carrier = @getUnitEntity(carrierId)
    carrier.unit.carriedUnits.push u.unit
    u.unit.moved = true
    @canvas.removeEntity u
    @canvas.removeEntity u.healthIndicator
    @canvas.redrawEntity carrier
    callback?()

  AnimatedMap::unloadUnit = (unitId, carrierId, tileId, callback) ->
    t = @getTile(tileId)
    carrier = @getUnitEntity(carrierId)
    unit = carrier.unit.carriedUnits.filter((unit) ->
      unit.unitId is unitId
    )[0]
    throw "ERROR: Unit not inside the carrier!"  if unit is `undefined`
    carrier.unit.carriedUnits = carrier.unit.carriedUnits.filter((unit) ->
      unit.unitId isnt unitId
    )
    u = new MapUnit(unit, t.x, t.y, this)
    u.healthIndicator = new HealthIndicator(u)
    t.unit = u.unit
    unit.moved = true
    carrier.unit.moved = true
    if @animate
      @canvas.addAnimation new aja.PositionAnimation(u, carrier.x, carrier.y, u.x, u.y, 200 / @animationSpeed, aja.easing.Linear, callback)
      u.x = carrier.x
      u.y = carrier.y
    @canvas.redrawEntity carrier
    @canvas.addEntity u
    @canvas.addEntity u.healthIndicator

  AnimatedMap::destroyUnit = (unitId, callback) ->
    doDestroy = ->
      canvas.removeEntity u
      canvas.removeEntity u.healthIndicator
      t.unit = null
      callback?()
    u = @getUnitEntity(unitId)
    t = @getTile(u.tx, u.ty)
    canvas = @canvas
    if @animate
      u.effects = [new aja.OpacityEffect]
      u.opacity = 1.0
      @canvas.addAnimation new aja.NumberAnimation(u,
        opacity:
          from: 1.0
          to: 0.0
      , 500 / @animationSpeed, aja.easing.SineIn, doDestroy)
    else
      doDestroy()

  AnimatedMap::repairUnit = (unitId, newHealth, callback) ->
    u = @getUnitEntity(unitId)
    change = newHealth - u.unit.health
    if change > 0 and @animate
      changeString = "" + change

      for n, i in changeString
        do (n, i) =>
          n = parseInt(n)
          number = new MapDigit(n, u.x - (changeString.length - i) * @theme.settings.number.width, u.y, this)
          number.effects = [new aja.OpacityEffect]
          number.opacity = 1.0
          @canvas.addEntity number
          anim = new aja.NumberAnimation(number, {y:{delta: -32}, opacity: 0.0}, 1000 / @animationSpeed, aja.easing.QuadIn, =>
            @canvas.removeEntity number
          )
          @canvas.addAnimation anim
        
    u.unit.health = newHealth
    @canvas.redrawEntity u
    callback?()

  AnimatedMap::buildUnit = (tileId, unit, callback) ->
    t = @getTile(tileId)
    t.unit = unit
    unit.health = 100
    unit.deployed = false
    unit.moved = true
    unit.carriedUnits = []
    u = new MapUnit(unit, t.x, t.y, this)
    u.healthIndicator = new HealthIndicator(u)
    if @animate
      u.effects = [new aja.OpacityEffect]
      u.opacity = 0.0
      @canvas.addAnimation new aja.NumberAnimation(u,
        opacity:
          from: 0.0
          to: 1.0
      , 500 / @animationSpeed, aja.easing.SineIn, callback)
      @canvas.addEntity u
      @canvas.addEntity u.healthIndicator
    else
      @canvas.addEntity u
      @canvas.addEntity u.healthIndicator
      callback()

  AnimatedMap::regenerateCapturePointsTile = (tileId, newCapturePoints, callback) ->
    t = @getTile(tileId)
    unless t.captureBar
      t.captureBar = new CaptureBar(t, this)
      @canvas.addEntity t.captureBar
    t.captureBar.visible = t.capturePoints < 200
    t.capturePoints = newCapturePoints
    t.beingCaptured = false
    @refresh()
    callback?()

  AnimatedMap::produceFundsTile = (tileId, callback) ->
    callback?()

  AnimatedMap::beginTurn = (player, callback) ->
    callback?()

  AnimatedMap::endTurn = (player, callback) ->
    @tiles.forEach (el) ->
      el.unit.moved = false  if el.unit

    @refresh()
    callback?()

  AnimatedMap::turnTimeout = (player, callback) ->
    callback?()

  AnimatedMap::finished = (winner, callback) ->
    callback?()

  AnimatedMap::surrender = (player, callback) ->
    that = this
    @tiles.forEach (tile) ->
      tile.owner = 0  if tile.owner is player
      tile.unit.owner = 0  if tile.unit isnt null and tile.unit.owner is player

    @refresh()
    callback?()

  class MapUnit
    constructor: (@unit, @tx, @ty, @map) ->
      @setToHex @tx, @ty
      @unitId = unit.unitId
    
  class MapDigit
    constructor: (n, @x, @y, @map) ->
      @coord = map.theme.getHealthNumberCoordinates(n)
      @z = 2
    
  class Overlay
    constructor: (map) ->
      @canvas = document.createElement("canvas")
      @resize map.canvas.width, map.canvas.height
      
  class CaptureBar
    constructor: (@tile, @map) ->
      tileCoords = @map.hex2rectCoords(tile.x, tile.y)
      @x = tileCoords.e(1)
      @y = tileCoords.e(2) - (@map.theme.settings.image.height - @map.theme.settings.hex.height) + @map.theme.getTileOffset(tile.type, tile.subtype, tile.owner)
      @z = 1
  
  class HealthIndicator
    constructor: (@mapUnit) ->
      @z = 1

  MapUnit::hexPos = (x, y) ->
    pos = @map.hex2rectCoords(x, y)
    unitPos = $V([pos.e(1), pos.e(2) - (@map.theme.settings.image.height - @map.theme.settings.hex.height)])
    unitPos

  MapUnit::setToHex = (x, y) ->
    pos = @hexPos(x, y)
    @x = pos.e(1)
    @y = pos.e(2)

  MapUnit::rect = (ctx) ->
    x: @x
    y: @y
    w: @map.theme.settings.image.width
    h: @map.theme.settings.image.height

  MapUnit::draw = (ctx) ->
    sprites = (if @unit.moved then @map.spritesMoved else @map.sprites)
    coord = (if @unit then @map.theme.getUnitCoordinates(@unit.type, @unit.owner) else null)
    ctx.drawImage sprites, coord.x, coord.y, @map.theme.settings.image.width, @map.theme.settings.image.height, @x, @y, @map.theme.settings.image.width, @map.theme.settings.image.height  if coord
    if @unit.deployed
      deployCoord = @map.theme.getDeployEmblemCoordinates()
      ctx.drawImage sprites, deployCoord.x, deployCoord.y, @map.theme.settings.image.width, @map.theme.settings.image.height, @x, @y, @map.theme.settings.image.width, @map.theme.settings.image.height
    if @map.rules
      unitType = @map.rules.units[@unit.type]
      if unitType.carryNum > 0
        freeCoords = @map.theme.getCoordinates(@map.theme.settings.carrierSlot.freeSlotName)
        occupiedCoords = @map.theme.getCoordinates(@map.theme.settings.carrierSlot.occupiedSlotName)
        i = 0

        while i < unitType.carryNum
          slotCoords = (if i < @unit.carriedUnits.length then occupiedCoords else freeCoords)
          ctx.drawImage @map.sprites, slotCoords.x, slotCoords.y, @map.theme.settings.image.width, @map.theme.settings.image.height, @x, @y - i * @map.theme.settings.carrierSlot.slotHeight, @map.theme.settings.image.width, @map.theme.settings.image.height
          ++i

  MapDigit::draw = (ctx) ->
    ctx.drawImage @map.sprites, @coord.x, @coord.y, @map.theme.settings.image.width, @map.theme.settings.image.height, @x, @y, @map.theme.settings.image.width, @map.theme.settings.image.height

  MapDigit::rect = (ctx) ->
    x: @x
    y: @y
    w: @map.theme.settings.image.width
    h: @map.theme.settings.image.height

  Overlay::resize = (w, h) ->
    @canvas.width = w
    @canvas.height = h

  Overlay::draw = (ctx) ->
    ctx.drawImage @canvas, 0, 0

  Overlay::rect = (ctx) ->
    x: 0
    y: 0
    w: @canvas.width
    h: @canvas.height

  CaptureBar::draw = (ctx) ->
    if @tile.capturePoints < 200
      barCoords = @map.theme.getCoordinates(@map.theme.settings.captureBar.barName)
      bitCoords = @map.theme.getCoordinates((if @tile.beingCaptured then @map.theme.settings.captureBar.capturingName else @map.theme.settings.captureBar.recoveringName))
      numBits = Math.ceil(@map.theme.settings.captureBar.totalBits * @tile.capturePoints / 200)
      ctx.drawImage @map.sprites, barCoords.x, barCoords.y, @map.theme.settings.image.width, @map.theme.settings.image.height, @x, @y, @map.theme.settings.image.width, @map.theme.settings.image.height
      i = 0

      while i < numBits
        ctx.drawImage @map.sprites, bitCoords.x, bitCoords.y, @map.theme.settings.image.width, @map.theme.settings.image.height, @x, @y - i * @map.theme.settings.captureBar.bitHeight, @map.theme.settings.image.width, @map.theme.settings.image.height
        ++i

  CaptureBar::rect = ->
    x: @x
    y: @y
    w: @map.theme.settings.image.width
    h: @map.theme.settings.image.height

  HealthIndicator::draw = (ctx) ->
    if @mapUnit.unit.health < 100 and @mapUnit.unit.health >= 0
      healthString = "" + @mapUnit.unit.health
      i = 0

      while i < healthString.length
        n = healthString[i]
        numCoord = @mapUnit.map.theme.getHealthNumberCoordinates(n)
        ctx.drawImage @mapUnit.map.sprites, numCoord.x, numCoord.y, @mapUnit.map.theme.settings.image.width, @mapUnit.map.theme.settings.image.height, @mapUnit.x - (healthString.length - 1 - i) * (@mapUnit.map.theme.settings.number.width + 1), @mapUnit.y, @mapUnit.map.theme.settings.image.width, @mapUnit.map.theme.settings.image.height
        ++i

  HealthIndicator::rect = ->
    x: @mapUnit.x
    y: @mapUnit.y
    w: @mapUnit.map.theme.settings.image.width
    h: @mapUnit.map.theme.settings.image.height

  AnimatedMap

