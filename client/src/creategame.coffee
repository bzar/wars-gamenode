require ["Theme", "Map", "gamenode", "base"], (Theme, Map) ->
  client = new GameNodeClient(Skeleton)
  session = null
  paginator = null
  initialPage = /(\d+)/.exec(window.location.hash)
  if initialPage isnt null
    initialPage = parseInt(initialPage[1])
  else
    initialPage = 1
    window.location.hash = initialPage
  lastMapId = null
  mapId = /[?&]mapId=([0-9a-f]+)/.exec(window.location.search)
  mapId = mapId[1]  if mapId isnt null
  theme = null
  mapPainter = null
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      client.stub.profile (response) ->
        theme = new Theme(response.profile.settings.gameTheme)
        theme.load ->
          mapPainter = new Map(`undefined`, `undefined`, theme)
          initializeControls()
          populateNavigation session
          mapPainter.doPreload ->
            if mapId is null
              showMaps()
            else
              showFullMapPreview()

  initializeControls = ->
    $("#turnTimeLimit").change ->
      if $(this).prop("checked")
        $("#timeLimitInput").show()
      else
        $("#timeLimitInput").hide()

    $("#turnTimeLimit").change()
    $("#backToMaps").click (e) ->
      e.preventDefault()
      showMaps()

    $("#backToMapPreview").click (e) ->
      e.preventDefault()
      showFullMapPreview()

    $("#toGameSettings").click (e) ->
      e.preventDefault()
      showGameSettings()

    $("#createGame").click (e) ->
      e.preventDefault()
      createGame()

  createGame = ->
    name = $("#gameName").val()
    publicGame = $("#publicGame").prop("checked")
    limitTurnTime = $("#turnTimeLimit").prop("checked")
    hourLimitStr = $("#hourLimit").val()
    minuteLimitStr = $("#minuteLimit").val()
    secondLimitStr = $("#secondLimit").val()
    hourLimit = parseInt((if hourLimitStr then hourLimitStr else 0), 10)
    minuteLimit = parseInt((if minuteLimitStr then minuteLimitStr else 0), 10)
    secondLimit = parseInt((if secondLimitStr then secondLimitStr else 0), 10)
    turnLength = null
    if limitTurnTime and not isNaN(hourLimit) and not isNaN(minuteLimit) and not isNaN(secondLimit)
      turnLength = (hourLimit * 60 + minuteLimit) * 60 + secondLimit
      turnLength = (if turnLength then turnLength else null)
    client.stub.createGame name, mapId, publicGame, turnLength, (response) ->
      if response.success
        document.location = "/pregame.html?gameId=" + response.gameId
      else
        alert "Error creating game! " + response.reason

  showMaps = ->
    populateMaps client  unless $("#maps:empty").length is 0
    $("#mapSelection").show()
    $("#mapFullPreview").hide()
    $("#gameSettings").hide()
    $("#navigation").show()
    $("#selectMapControls").show()
    $("#mapPreviewControls").hide()
    $("#createGameControls").hide()
    history.pushState `undefined`, `undefined`, document.location.pathname  unless document.location.search.length is 0
  showFullMapPreview = ->
    unless lastMapId is mapId
      client.stub.mapData mapId, (response) ->
        mapData = response.mapData
        populateMapInfo response
        populateMapTileStats mapData
        canvas = $("#mapCanvas")
        mapPainter.canvas = canvas[0]
        mapPainter.tiles = mapData
        mapSize = mapPainter.getMapDimensions()
        width = mapSize.e(1)
        height = mapSize.e(2)
        canvas.attr "width", width
        canvas.attr "height", height
        mapPainter.scale = 1.0
        mapPainter.autoscale = false
        mapPainter.refresh()

    $("#mapSelection").hide()
    $("#mapFullPreview").show()
    $("#gameSettings").hide()
    $("#navigation").hide()
    $("#selectMapControls").hide()
    $("#mapPreviewControls").show()
    $("#createGameControls").hide()
    history.pushState `undefined`, `undefined`, document.location.pathname + "?mapId=" + mapId
    lastMapId = mapId
  showGameSettings = ->
    $("#mapSelection").hide()
    $("#mapFullPreview").hide()
    $("#gameSettings").show()
    $("#navigation").hide()
    $("#selectMapControls").hide()
    $("#mapPreviewControls").hide()
    $("#createGameControls").show()
  changePage = (e, page) ->
    e.preventDefault()  if e isnt `undefined`
    paginator.setPage page
    window.location.hash = page
    updatePageControls()
  updatePageControls = ->
    pages = $("#pages")
    pages.empty()
    i = 0

    while i < paginator.pages()
      pageLink = $("<a></a>")
      pageLink.text i + 1
      pageLink.attr "href", "#" + (i + 1)
      pageLink.attr "page", i + 1
      pageLink.addClass "pageLink"
      pages.append pageLink
      ++i
    $("#firstPage").attr("href", "#" + paginator.firstPage()).toggle paginator.currentPage isnt paginator.firstPage()
    $("#lastPage").attr("href", "#" + paginator.lastPage()).toggle paginator.currentPage isnt paginator.lastPage()
    $("#prevPage").attr("href", "#" + paginator.prevPage()).toggle paginator.currentPage isnt paginator.firstPage()
    $("#nextPage").attr("href", "#" + paginator.nextPage()).toggle paginator.currentPage isnt paginator.lastPage()
    $(".pageLink").removeClass "current"
    $(".pageLink[page=\"" + paginator.currentPage + "\"]").addClass "current"
    $(".pageLink").click (e) ->
      changePage e, parseInt($(this).attr("page"))

    $("#pageControls").toggle paginator.pages() > 1
  populateMaps = (client) ->
    client.stub.maps null, (response) ->
      maps = response.maps
      mapList = $("#maps")
      paginator = new Paginator(maps, ->
        mapList.empty()
      , (map) ->
        container = $("<a></a>")
        name = $("<div></div>")
        preview = $("<div></div>")
        funds = $("<div></div>")
        players = $("<div></div>")
        previewCanvas = $("<canvas></canvas>")
        previewCanvas.text "Preview of " + map.name
        previewCanvas.addClass "mapThumbnail"
        previewCanvas.attr "width", 200
        previewCanvas.attr "height", 200
        preview.append previewCanvas
        name.text map.name
        name.addClass "name"
        funds.text "Initial funds: " + map.funds
        funds.addClass "info"
        players.text "Max players: " + map.players
        players.addClass "info"
        container.append name
        container.append preview
        container.append funds
        container.append players
        container.attr "mapId", map.mapId
        container.addClass "mapContainer"
        container.click (e) ->
          e.preventDefault()
          $(".mapContainer").removeClass "selected"
          mapId = $(this).attr("mapId")
          showFullMapPreview()

        mapList.append container
        client.stub.mapData map.mapId, (response) ->
          mapData = response.mapData
          mapPainter.canvas = previewCanvas[0]
          mapPainter.tiles = mapData
          mapPainter.autoscale = true
          mapPainter.refresh()

      )
      $("#firstPage").click (e) ->
        changePage e, paginator.firstPage()

      $("#lastPage").click (e) ->
        changePage e, paginator.lastPage()

      $("#nextPage").click (e) ->
        changePage e, paginator.nextPage()

      $("#prevPage").click (e) ->
        changePage e, paginator.prevPage()

      changePage `undefined`, initialPage
      populateMapFilter maps

  filterMaps = (maps) ->
    minPlayers = parseInt($("#minPlayers").val())
    maxPlayers = parseInt($("#maxPlayers").val())
    authorId = $("#mapAuthor").val()
    namePart = $("#mapName").val().toLowerCase()
    paginator.data = maps.filter((map) ->
      map.players >= minPlayers and map.players <= maxPlayers and (authorId is "" or map.authorId is authorId) and (namePart is "" or map.name.toLowerCase().indexOf(namePart) isnt -1)
    )
    paginator.setPage paginator.firstPage()
    updatePageControls()
  populateMapFilter = (maps) ->
    minPlayers = null
    maxPlayers = null
    authors = [
      name: "Anyone"
      authorId: ""
    ]
    maps.forEach (map) ->
      minPlayers = (if minPlayers and minPlayers < map.players then minPlayers else map.players)
      maxPlayers = (if maxPlayers and maxPlayers > map.players then maxPlayers else map.players)
      unless authors.some((author) ->
        author.authorId is new String(map.authorId)
      )
        authors.push
          name: map.authorName
          authorId: map.authorId


    minPlayersSelect = $("#minPlayers")
    maxPlayersSelect = $("#maxPlayers")
    i = minPlayers

    while i <= maxPlayers
      minOption = $("<option></option>")
      minOption.attr "value", i
      minOption.text i
      minOption.prop "selected", i is minPlayers
      minPlayersSelect.append minOption
      maxOption = $("<option></option>")
      maxOption.attr "value", i
      maxOption.text i
      maxOption.prop "selected", i is maxPlayers
      maxPlayersSelect.append maxOption
      ++i
    mapAuthorSelect = $("#mapAuthor")
    authors.forEach (author) ->
      option = $("<option></option>")
      option.attr "value", author.authorId
      option.text author.name
      mapAuthorSelect.append option

    minPlayersSelect.change ->
      maxPlayersSelect.val $(this).val()  if parseInt(maxPlayersSelect.val()) < parseInt($(this).val())

    maxPlayersSelect.change ->
      minPlayersSelect.val $(this).val()  if parseInt(minPlayersSelect.val()) > parseInt($(this).val())

    $("#mapFilterForm").submit (e) ->
      e.preventDefault()
      filterMaps maps

  populateMapInfo = (map) ->
    newItem = (text) ->
      item = $("<li></li>")
      item.text text  if text
      mapInfo.append item
      item
    mapInfo = $("#mapInfo")
    mapInfo.empty()
    newItem map.name
    newItem "Funds: " + map.funds
    newItem "Players: " + map.players
  populateMapTileStats = (mapData) ->
    stats = {}
    i = 0

    while i < mapData.length
      tile = mapData[i]
      unless tile.type of stats
        stats[tile.type] = 1
      else
        stats[tile.type] += 1
      ++i
    client.stub.gameRules null, (rules) ->
      captureFlagId = null
      for flagId of rules.terrainFlags
        if rules.terrainFlags[flagId].name is "Capturable"
          captureFlagId = parseInt(flagId)
          break
      if captureFlagId isnt null
        mapTiles = $("#mapTiles")
        mapTiles.empty()
        for tileType of stats
          unless rules.terrains[tileType].flags.indexOf(captureFlagId) is -1
            item = $("<li></li>")
            image = $("<span></span>")
            image.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
            image.addClass "sprite"
            image.css "width", theme.settings.image.width
            image.css "height", theme.settings.image.height
            pos = theme.getTileCoordinates(tileType, 0, 0)
            image.css "background-position", -pos.x + "px " + (-pos.y + (theme.settings.image.height - theme.settings.hex.height - theme.settings.hex.thickness)) + "px"
            text = $("<span></span")
            text.text "x" + stats[tileType]
            propPos = theme.getTilePropCoordinates(tileType, 0, 0)
            if propPos
              terrainProp = $("<span></span>")
              terrainProp.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
              terrainProp.css "width", theme.settings.image.width
              terrainProp.css "height", theme.settings.image.height
              terrainProp.css "display", "block"
              terrainProp.css "background-position", -propPos.x + "px " + (-propPos.y - theme.settings.hex.thickness) + "px"
              image.append terrainProp
            item.append image
            item.append text
            item.addClass "mapTileStat"
            mapTiles.append item


