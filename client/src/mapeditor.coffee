require ["Theme", "Map", "gamenode", "base"], (Theme, Map) ->
  client = new GameNodeClient(Skeleton)
  session = null
  mapId = /[?&]mapId=([0-9a-f]+)/.exec(window.location.search)
  mapId = mapId[1]  if mapId isnt null
  theme = null
  mapPainter = null
  mouseDown = false
  lastX = null
  lastY = null
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      client.stub.profile (response) ->
        theme = new Theme(response.profile.settings.gameTheme)
        theme.load ->
          mapPainter = new Map(`undefined`, 1.0, theme)
          populateNavigation session
          initializeMapEditor client

  updatePalette = ->
    playerSelection = $("#playerSelection")
    terrainSelection = $("#terrainSelection")
    unitSelection = $("#unitSelection")
    terrainPalette = $("#terrainPalette")
    unitPalette = $("#unitPalette")
    playerItems = $(".playerSelection")
    playerItems.removeClass "enabled"
    playerItems.removeClass "disabled"
    if terrainSelection.hasClass("selected")
      unitPalette.hide()
      terrainPalette.show()
      terrainType = $("#terrainTypePalette .sprite.selected").attr("type")
      terrainSubtypePalette = $("#terrainSubtypePalette")
      playerItems.each (ii, el) ->
        option = $(el)
        owner = option.attr("value")
        disabled = $(".sprite[type=\"" + terrainType + "\"][owner=\"" + owner + "\"]", terrainSubtypePalette).length is 0
        option.addClass "enabled"  unless disabled

      if $(".selected.enabled", playerSelection).length is 0
        unless $(".enabled", playerSelection).length is 0
          playerItems.removeClass "selected"
          $($(".playerSelection.enabled")[0]).addClass "selected"
      selectedOwner = $(".playerSelection.selected").attr("value")
      $(".sprite", terrainSubtypePalette).hide()
      $(".sprite[type=\"" + terrainType + "\"][owner=\"" + selectedOwner + "\"]", terrainSubtypePalette).show()
      if $(".sprite.selected:visible", terrainSubtypePalette).length is 0
        $(".sprite", terrainSubtypePalette).removeClass "selected"
        $($(".sprite:visible", terrainSubtypePalette)[0]).addClass "selected"
    else
      terrainPalette.hide()
      unitPalette.show()
      unitPalette = $("#unitPalette")
      playerItems.each (ii, el) ->
        option = $(el)
        owner = option.attr("value")
        disabled = $(".sprite[owner=\"" + owner + "\"]", unitPalette).length is 0
        option.addClass "enabled"  unless disabled

      if $(".selected.enabled", playerSelection).length is 0
        unless $(".enabled", playerSelection).length is 0
          playerItems.removeClass "selected"
          $($(".playerSelection.enabled")[0]).addClass "selected"
      selectedOwner = $(".playerSelection.selected").attr("value")
      $(".sprite", unitPalette).hide()
      $(".sprite[owner=\"" + selectedOwner + "\"]", unitPalette).show()
      $("[type=\"null\"]", unitPalette).show()
      if $(".selected:visible", unitPalette).length is 0
        $(".sprite", unitPalette).removeClass "selected"
        $($(":visible", unitPalette)[0]).addClass "selected"
  selectedBrush = ->
    terrainSelection = $("#terrainSelection")
    if terrainSelection.hasClass("selected")
      selected = $($("#terrainSubtypePalette .sprite.selected")[0])
      type: parseInt(selected.attr("type"))
      subtype: parseInt(selected.attr("subtype"))
      owner: parseInt(selected.attr("owner"))
    else
      selected = $($("#unitPalette .selected")[0])
      return unit: null  if selected.attr("type") is "null"
      unit:
        type: parseInt(selected.attr("type"))
        owner: parseInt(selected.attr("owner"))
  paintTile = (x, y, brush) ->
    tile = mapPainter.getTile(x, y)
    return  unless tile
    tile.type = brush.type  if brush.type isnt `undefined`
    tile.subtype = brush.subtype  if brush.subtype isnt `undefined`
    tile.owner = brush.owner  if brush.owner isnt `undefined`
    tile.unit = brush.unit  if brush.unit isnt `undefined`
  resizeMap = (width, height) ->
    mapSize = mapPainter.getMapLimits().max
    w = mapSize.e(1) + 1
    h = mapSize.e(2) + 1
    if width > w
      x = w

      while x < width
        y = 0

        while y < h
          mapPainter.tiles.push
            x: x
            y: y - Math.floor(x / 2)
            type: 1
            subtype: 0
            owner: 0
            unit: null

          ++y
        ++x
    else if width < w
      i = 0

      while i < mapPainter.tiles.length
        tile = mapPainter.tiles[i]
        if tile.x >= width
          mapPainter.tiles.splice i, 1
          i -= 1
        ++i
    if height > h
      x = 0

      while x < width
        y = h

        while y < height
          mapPainter.tiles.push
            x: x
            y: y - Math.floor(x / 2)
            type: 1
            subtype: 0
            owner: 0
            unit: null

          ++y
        ++x
    else if height < h
      i = 0

      while i < mapPainter.tiles.length
        tile = mapPainter.tiles[i]
        if tile.y + Math.floor(tile.x / 2) >= height
          mapPainter.tiles.splice i, 1
          i -= 1
        ++i
  shiftMapUp = ->
    limits = mapPainter.getMapLimits()
    i = 0

    while i < mapPainter.tiles.length
      tile = mapPainter.tiles[i]
      if tile.y is -Math.floor(tile.x / 2)
        tile.y = limits.max.e(2) - Math.floor(tile.x / 2)
      else
        tile.y -= 1
      ++i
    mapPainter.refresh()
  shiftMapDown = ->
    limits = mapPainter.getMapLimits()
    i = 0

    while i < mapPainter.tiles.length
      tile = mapPainter.tiles[i]
      if tile.y + Math.floor(tile.x / 2) is limits.max.e(2)
        tile.y = -Math.floor(tile.x / 2)
      else
        tile.y += 1
      ++i
    mapPainter.refresh()
  shiftMapLeft = ->
    limits = mapPainter.getMapLimits()
    i = 0

    while i < mapPainter.tiles.length
      tile = mapPainter.tiles[i]
      if tile.x is 0
        tile.x = limits.max.e(1)
        tile.y -= Math.floor(tile.x / 2)
      else
        tile.x -= 1
        tile.y += 1  if tile.x % 2
      ++i
    mapPainter.refresh()
  shiftMapRight = ->
    limits = mapPainter.getMapLimits()
    i = 0

    while i < mapPainter.tiles.length
      tile = mapPainter.tiles[i]
      if tile.x is limits.max.e(1)
        tile.y += Math.floor(tile.x / 2)
        tile.x = 0
      else
        tile.x += 1
        tile.y -= 1  if tile.x % 2 is 0
      ++i
    mapPainter.refresh()
  saveMap = (name, funds) ->
    mapData = mapPainter.tiles
    if mapId is null
      client.stub.createMap name, funds, mapData, (response) ->
        if response.success
          mapId = response.mapId
          history.pushState `undefined`, `undefined`, document.location.pathname + "?mapId=" + mapId
          $("#mapDeleteForm").show()
          message = $("#mapSavedMessage")
          message.show()
          message.fadeOut 2000
        else
          alert "Error saving map!" + response.reason

    else
      client.stub.updateMap mapId, name, funds, mapData, (response) ->
        if response.success
          message = $("#mapSavedMessage")
          message.show()
          message.fadeOut 2000
        else
          alert "Error saving map!" + response.reason

  importMap = ->
    info = JSON.parse($("#importExportData").val())
    if info
      $("#mapName").val info.name
      $("#mapFunds").val info.funds
      mapPainter.tiles = info.data
      setCanvasSize $("#mapEditorView")
      mapPainter.refresh()
    else
      alert "Invalid map data!"
  exportMap = ->
    info =
      name: $("#mapName").val()
      funds: $("#mapFunds").val()
      data: mapPainter.tiles

    $("#importExportData").val JSON.stringify(info)
  handleMouseDown = (event) ->
    mouseDown = true
    handleMouseMove event
    false
  handleMouseUp = (event) ->
    mouseDown = false
    lastX = null
    lastY = null
    false
  handleMouseMove = (event) ->
    if mouseDown
      x = mapPainter.eventToTileX(event)
      y = mapPainter.eventToTileY(event)
      if x isnt lastX or y isnt lastY
        brush = selectedBrush()
        paintTile x, y, brush
        mapPainter.refresh()
        lastX = x
        lastY = y
    false
  handleMouseEnter = (event) ->
    mouseDown = false
  setCanvasSize = (canvas) ->
    mapSize = mapPainter.getMapDimensions()
    width = mapSize.e(1)
    height = mapSize.e(2)
    canvas.attr "width", width
    canvas.attr "height", height
  initializeMap = (canvas, mapData) ->
    mapPainter.canvas = canvas[0]
    mapPainter.tiles = mapData
    setCanvasSize canvas
    mapLimits = mapPainter.getMapLimits()
    $("#mapWidth").val mapLimits.max.e(1) + 1
    $("#mapHeight").val mapLimits.max.e(2) + 1
    mapPainter.refresh()
    canvas.mousedown handleMouseDown
    canvas.mouseup handleMouseUp
    canvas.mousemove handleMouseMove
    canvas.mouseenter handleMouseEnter
  initializeMapEditor = (client) ->
    canvas = $("#mapEditorView")
    mapPainter.doPreload ->
      if mapId isnt null
        client.stub.mapData mapId, (response) ->
          mapData = response.mapData
          $("#mapName").val response.name
          $("#mapFunds").val response.funds
          initializeMap canvas, mapData

      else
        $("#mapDeleteForm").hide()
        mapData = []
        y = 0

        while y < 15
          x = 0

          while x < 15
            mapData.push
              x: x
              y: y - Math.floor(x / 2)
              type: 1
              subtype: 0
              owner: 0
              unit: null

            ++x
          ++y
        initializeMap canvas, mapData

    
    # MAIN MENU / EDITOR TOOLS
    $("#showMapEditorTools").click (e) ->
      e.preventDefault()
      $("#mapEditorTools").show()
      $("#mainMenu").hide()

    $("#showMainMenu").click (e) ->
      e.preventDefault()
      $("#mapEditorTools").hide()
      $("#mainMenu").show()

    $("#showMapEditorTools").click()
    
    # TOOL SELECTION
    toolSelection = $("#toolSelection")
    palette = $("#palette")
    mapSize = $("#mapSize")
    mapProperties = $("#mapProperties")
    $("a", toolSelection).click (e) ->
      e.preventDefault()
      palette.hide()
      mapSize.hide()
      mapProperties.hide()
      $($(this).attr("value")).show()

    $("#showPalette").click()
    
    # PALETTE
    terrainPalette = $("#terrainPalette")
    unitPalette = $("#unitPalette")
    terrainSelection = $("#terrainSelection")
    unitSelection = $("#unitSelection")
    playerSelection = $("#playerSelection")
    $(".playerSelection").each ->
      $(this).css "background-color", theme.getPlayerColorString(parseInt($(this).attr("value")))

    $(".playerSelection").click (e) ->
      e.preventDefault()
      return  if $(this).hasClass("disabled")
      $(".playerSelection").removeClass "selected"
      $(this).addClass "selected"
      updatePalette()

    $(".playerSelection:first-child").click()
    terrainSelection.click ->
      unitSelection.removeClass "selected"
      terrainSelection.addClass "selected"
      updatePalette()

    unitSelection.click ->
      terrainSelection.removeClass "selected"
      unitSelection.addClass "selected"
      updatePalette()

    terrainSelection.click()
    terrainTypePalette = $("#terrainTypePalette")
    terrainSubtypePalette = $("#terrainSubtypePalette")
    terrainType = 0

    while terrainType < theme.getNumberOfTileTypes()
      terrainTypeItem = $("<span></span>")
      terrainTypeItem.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
      terrainTypeItem.addClass "sprite"
      terrainTypeItem.css "width", theme.settings.image.width
      terrainTypeItem.css "height", theme.settings.image.height
      pos = theme.getTileCoordinates(terrainType, 0, 0)
      terrainTypeItem.css "background-position", -pos.x + "px " + (-pos.y + (theme.settings.image.height - theme.settings.hex.height - theme.settings.hex.thickness)) + "px"
      terrainTypeItem.attr "type", terrainType
      propPos = theme.getTilePropCoordinates(terrainType, 0, 0)
      if propPos
        terrainProp = $("<span></span>")
        terrainProp.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
        terrainProp.css "width", theme.settings.image.width
        terrainProp.css "height", theme.settings.image.height
        terrainProp.css "display", "block"
        terrainProp.css "background-position", -propPos.x + "px " + (-propPos.y - theme.settings.hex.thickness) + "px"
        terrainTypeItem.append terrainProp
      terrainTypePalette.append terrainTypeItem
      terrainSubtype = 0

      while terrainSubtype < theme.getNumberOfTileSubtypes(terrainType)
        terrainOwner = 0

        while terrainOwner < theme.getNumberOfTileOwners(terrainType, terrainSubtype)
          terrainSubtypeItem = $("<span></span>")
          terrainSubtypeItem.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
          terrainSubtypeItem.addClass "sprite"
          terrainSubtypeItem.css "width", theme.settings.image.width
          terrainSubtypeItem.css "height", theme.settings.image.height
          pos = theme.getTileCoordinates(terrainType, terrainSubtype, terrainOwner)
          terrainSubtypeItem.css "background-position", -pos.x + "px " + (-pos.y + (theme.settings.image.height - theme.settings.hex.height - theme.settings.hex.thickness)) + "px"
          terrainSubtypeItem.attr "type", terrainType
          terrainSubtypeItem.attr "subtype", terrainSubtype
          terrainSubtypeItem.attr "owner", terrainOwner
          propPos = theme.getTilePropCoordinates(terrainType, terrainSubtype, terrainOwner)
          if propPos
            terrainProp = $("<span></span>")
            terrainProp.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
            terrainProp.css "width", theme.settings.image.width
            terrainProp.css "height", theme.settings.image.height
            terrainProp.css "display", "block"
            terrainProp.css "background-position", -propPos.x + "px " + (-propPos.y - theme.settings.hex.thickness) + "px"
            terrainSubtypeItem.append terrainProp
          terrainSubtypePalette.append terrainSubtypeItem
          ++terrainOwner
        ++terrainSubtype
      ++terrainType
    $("#terrainTypePalette .sprite").click ->
      $("#terrainTypePalette .sprite.selected").removeClass "selected"
      $(this).addClass "selected"
      updatePalette()

    $("#terrainSubtypePalette .sprite").click ->
      $("#terrainSubtypePalette .sprite.selected").removeClass "selected"
      $(this).addClass "selected"
      updatePalette()

    unitEraserItem = $("<span></span>")
    unitEraserItem.attr "type", "null"
    unitEraserItem.attr "owner", "null"
    unitEraserItem.css "background-image", "url(" + theme.getEraserIconUrl() + ")"
    unitEraserItem.css "background-repeat", "no-repeat"
    unitEraserItem.css "background-position", "center"
    unitEraserItem.addClass "sprite"
    unitEraserItem.css "width", theme.settings.image.width
    unitEraserItem.css "height", theme.settings.image.width
    unitPalette.append unitEraserItem
    unitType = 0

    while unitType < theme.getNumberOfUnitTypes()
      unitOwner = 0

      while unitOwner < theme.getNumberOfUnitOwners(unitType)
        unitItem = $("<span></span>")
        pos = theme.getUnitCoordinates(unitType, unitOwner)
        continue  if pos is null
        unitItem.attr "type", unitType
        unitItem.attr "owner", unitOwner
        unitItem.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
        unitItem.addClass "sprite"
        unitItem.css "width", theme.settings.image.width
        unitItem.css "height", theme.settings.image.width
        unitItem.css "background-position", -pos.x + "px " + -pos.y + "px"
        unitPalette.append unitItem
        ++unitOwner
      ++unitType
    $("#unitPalette .sprite").click ->
      $("#unitPalette .sprite.selected").removeClass "selected"
      $(this).addClass "selected"
      updatePalette()

    terrainTypePalette.children().first().addClass "selected"
    updatePalette()
    unitPalette.children().first().addClass "selected"
    terrainSubtypePalette.children().first().addClass "selected"
    
    # MAP SIZE
    mapSize.submit (e) ->
      e.preventDefault()
      resizeMap parseInt($("#mapWidth").val()), parseInt($("#mapHeight").val())
      setCanvasSize canvas
      mapPainter.refresh()

    $("#shiftMapUp").click shiftMapUp
    $("#shiftMapDown").click shiftMapDown
    $("#shiftMapLeft").click shiftMapLeft
    $("#shiftMapRight").click shiftMapRight
    
    # MAP PROPERTIES
    $("#mapSaveForm").submit (e) ->
      e.preventDefault()
      saveMap $("#mapName").val(), parseInt($("#mapFunds").val())

    $("#import").click importMap
    $("#export").click exportMap
    $("#mapImportExportForm").submit (e) ->
      e.preventDefault()

    $("#mapDeleteForm").submit (e) ->
      e.preventDefault()
      if window.confirm("Are you sure you want to delete this map?")
        client.stub.deleteMap mapId, (response) ->
          if response.success
            window.location = "/myMaps.html"
          else
            alert "Error deleting map! " + response.reason


