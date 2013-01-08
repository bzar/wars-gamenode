require ["Theme", "Map", "gamenode", "base"], (Theme, Map) ->
  client = new GameNodeClient(Skeleton)
  session = null
  theme = null
  mapPainter = null
  paginator = null
  initialPage = /(\d+)/.exec(window.location.hash)
  if initialPage isnt null
    initialPage = parseInt(initialPage[1])
  else
    initialPage = 1
    window.location.hash = initialPage
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      client.stub.profile (response) ->
        theme = new Theme(response.profile.settings.gameTheme)
        theme.load ->
          mapPainter = new Map(`undefined`, `undefined`, theme)
          populateNavigation session
          populateMyMaps client


    )


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
    $("#firstPage").attr("href", "#" + paginator.firstPage()).addClass("disabled") if paginator.currentPage is paginator.firstPage()
    $("#lastPage").attr("href", "#" + paginator.lastPage()).addClass("disabled") if paginator.currentPage is paginator.lastPage()
    $("#prevPage").attr("href", "#" + paginator.prevPage()).addClass("disabled") if paginator.currentPage is paginator.firstPage()
    $("#nextPage").attr("href", "#" + paginator.nextPage()).addClass("disabled") if paginator.currentPage is paginator.lastPage()
    $(".pageLink").removeClass "current"
    $(".pageLink[page=\"" + paginator.currentPage + "\"]").addClass "current"
    $(".pageLink").click (e) ->
      changePage e, parseInt($(this).attr("page"))

    $("#pageControls").toggle paginator.pages() > 1
    
  changePage = (e, page) ->
    e.preventDefault()  if e isnt `undefined`
    paginator.setPage page
    window.location.hash = page
    updatePageControls()
  populateMyMaps = (client) ->
    mapPainter.doPreload ->
      client.stub.myMaps null, (response) ->
        maps = response.maps
        myMaps = $("#myMaps")
        paginator = new Paginator(maps, ->
          myMaps.empty()
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
          container.addClass "mapContainer"
          container.attr "href", "mapeditor.html?mapId=" + map.mapId
          myMaps.append container
          client.stub.mapData map.mapId, (response) ->
            mapData = response.mapData
            mapPainter.canvas = previewCanvas[0]
            mapPainter.tiles = mapData
            mapPainter.refresh()

        )
        paginator.setPage initialPage
        pages = $("#pages")
        i = 0

        while i < paginator.pages()
          pageLink = $("<a></a>")
          pageLink.text i + 1
          pageLink.attr "href", "#" + (i + 1)
          pageLink.attr "page", i + 1
          pageLink.addClass "pageLink"
          pages.append pageLink
          ++i
        $(".pageLink").click (e) ->
          changePage e, parseInt($(this).attr("page"))

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
    namePart = $("#mapName").val().toLowerCase()
    paginator.data = maps.filter((map) ->
      map.players >= minPlayers and map.players <= maxPlayers and (namePart is "" or map.name.toLowerCase().indexOf(namePart) isnt -1)
    )
    paginator.setPage paginator.firstPage()
    updatePageControls()
  populateMapFilter = (maps) ->
    minPlayers = null
    maxPlayers = null
    maps.forEach (map) ->
      minPlayers = (if minPlayers and minPlayers < map.players then minPlayers else map.players)
      maxPlayers = (if maxPlayers and maxPlayers > map.players then maxPlayers else map.players)

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
    minPlayersSelect.change ->
      maxPlayersSelect.val $(this).val()  if parseInt(maxPlayersSelect.val()) < parseInt($(this).val())

    maxPlayersSelect.change ->
      minPlayersSelect.val $(this).val()  if parseInt(minPlayersSelect.val()) > parseInt($(this).val())

    $("#mapFilterForm").submit (e) ->
      e.preventDefault()
      filterMaps maps

