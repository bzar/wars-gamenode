define ["Theme", "lib/sylvester"], (Theme, sylvester) ->
  Map = (canvas, scale, theme) ->
    @theme = (if theme then theme else new Theme("pixel"))
    @autoscale = not scale
    @scale = scale
    @canvas = canvas
    @xAxis = $V([@theme.settings.hex.width - @theme.settings.hex.triWidth, @theme.settings.hex.height / 2])
    @yAxis = $V([0, @theme.settings.hex.height])
    @origin = $V([0, @theme.settings.image.height - @theme.settings.hex.height])
    @tiles = null
    @sprites = null
  Map::hex2rectCoords = (hx, hy) ->
    p = (if hy isnt `undefined` then $V([hx, hy]) else hx)
    p = @xAxis.multiply(p.e(1)).add(@yAxis.multiply(p.e(2)))
    p = p.add(@origin)
    p

  Map::rect2hexCoords = (rx, ry) ->
    p = (if ry isnt `undefined` then $V([rx, ry]) else rx)
    p = p.subtract(@origin)
    origin = $M([[1, 0, -@theme.settings.hex.width / 2], [0, 1, -@theme.settings.hex.height / 2], [0, 0, 1]])
    mat = $M([[@xAxis.e(1), @yAxis.e(1), 0], [@xAxis.e(2), @yAxis.e(2), 0], [0, 0, 1]]).inv()
    mat.multiply(origin.multiply($V([p.e(1), p.e(2), 1]))).round()

  Map::getScale = ->
    if @autoscale
      mapSize = @getMapDimensions()
      horScale = @canvas.width / mapSize.e(1)
      verScale = @canvas.height / mapSize.e(2)
      @scale = (if horScale < verScale then horScale else verScale)
    @scale

  Map::getOffset = ->
    if @autoscale
      mapSize = @getMapDimensions()
      xOffset = (if mapSize.w < mapSize.h then (mapSize.h - mapSize.w) / 2 else 0)
      yOffset = (if mapSize.w > mapSize.h then (mapSize.w - mapSize.h) / 2 else 0)
      $V [xOffset, yOffset]
    else
      $V [0, 0]

  Map::doPreload = (callback) ->
    @sprites = new Image()
    @sprites.src = @theme.getSpriteSheetUrl()
    @sprites.onload = callback

  Map::getMapLimits = ->
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

  Map::getMapSize = ->
    size = @getMapLimits()
    size.max.subtract size.min

  Map::getMapDimensions = ->
    size = @getMapLimits().max
    w = @hex2rectCoords(size.e(1) + 1, 0).e(1)
    h = @hex2rectCoords(0, size.e(2) + 1).e(2)
    rectSize = $V([w, h]).add($V([@theme.settings.hex.triWidth + @origin.e(1), @origin.e(2)]))
    rectSize

  Map::getTile = (x, y) ->
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

  Map::clear = ->
    ctx = @canvas.getContext("2d")
    rect = @getMapDimensions().multiply(@getScale())
    ctx.clearRect 0, 0, rect.e(1), rect.e(2)

  Map::_drawHex = (ctx, tileType, tileSubtype, tileOwner, x, y) ->
    imageCoords = @theme.getTileCoordinates(tileType, tileSubtype, tileOwner)
    ctx.drawImage @sprites, imageCoords.x, imageCoords.y, @theme.settings.image.width, @theme.settings.image.height, x, y, @theme.settings.image.width, @theme.settings.image.height

  Map::_drawProp = (ctx, tileType, tileSubtype, tileOwner, x, y) ->
    imageCoords = @theme.getTilePropCoordinates(tileType, tileSubtype, tileOwner)
    return  if imageCoords is null
    ctx.drawImage @sprites, imageCoords.x, imageCoords.y, @theme.settings.image.width, @theme.settings.image.height, x, y, @theme.settings.image.width, @theme.settings.image.height

  Map::_drawPropOnHex = (ctx, tileType, tileSubtype, tileOwner, x, y) ->
    @_drawProp ctx, tileType, tileSubtype, tileOwner, x, y - (@theme.settings.image.height - @theme.settings.hex.height), @theme.settings.image.width, @theme.settings.image.height

  Map::_drawUnit = (ctx, unitType, unitOwner, x, y) ->
    imageCoords = @theme.getUnitCoordinates(unitType, unitOwner)
    ctx.drawImage @sprites, imageCoords.x, imageCoords.y, @theme.settings.image.width, @theme.settings.image.height, x, y, @theme.settings.image.width, @theme.settings.image.height

  Map::_drawUnitOnHex = (ctx, unitType, unitOwner, x, y) ->
    @_drawUnit ctx, unitType, unitOwner, x, y - (@theme.settings.image.height - @theme.settings.hex.height), @theme.settings.image.width, @theme.settings.image.height

  Map::_redraw = (ctx) ->
    i = 0

    while i < @tiles.length
      tile = @tiles[i]
      if tile
        r = @hex2rectCoords(tile.x, tile.y)
        offset = @theme.getTileOffset(tile.type, tile.subtype, tile.owner)
        @_drawHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset
        @_drawPropOnHex ctx, tile.type, tile.subtype, tile.owner, r.e(1), r.e(2) + offset
        @_drawUnitOnHex ctx, tile.unit.type, tile.unit.owner, r.e(1), r.e(2) + offset  if tile.unit
      ++i

  Map::sortTilesToRenderOrder = ->
    @tiles.sort (a, b) ->
      if a.y isnt b.y
        a.y - b.y
      else
        a.x - b.x


  Map::refresh = ->
    @sortTilesToRenderOrder()
    @clear()
    unless @autoscale
      mapSize = @getMapDimensions()
      @canvas.width = mapSize.e(1)
      @canvas.height = mapSize.e(2)
    ctx = @canvas.getContext("2d")
    ctx.save()
    offset = @getOffset()
    ctx.translate offset.e(1), offset.e(2)
    scale = @getScale()
    ctx.scale scale, scale
    @_redraw ctx, @tiles
    ctx.restore()

  Map::eventToTile = (event) ->
    cx = event.pageX - $(@canvas).offset().left
    cy = event.pageY - $(@canvas).offset().top
    offset = @getOffset()
    scale = @getScale()
    @rect2hexCoords (cx - offset.e(1)) / scale, (cy - offset.e(2)) / scale

  Map::eventToTileX = (event) ->
    @eventToTile(event).e 1

  Map::eventToTileY = (event) ->
    @eventToTile(event).e 2

  Map::tileWithUnit = (unitId) ->
    tiles = @tiles.filter((tile) ->
      tile.unit isnt null and tile.unit.unitId is unitId
    )
    (if tiles.length isnt 0 then tiles[0] else null)

  Map

