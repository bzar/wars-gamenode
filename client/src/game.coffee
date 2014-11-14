require ["Theme", "AnimatedMap", "GameLogic", "Color", "gamenode", "base", "lib/d3/d3", "ticker.js"], (Theme, AnimatedMap, GameLogic, Color) ->
  client = new GameNodeClient(Skeleton)
  gameClient = client
  session = null
  inTurn = false
  inTurnNumber = 0
  gameLogic = null
  theme = null
  map = null
  ticker = null
  turnCounter = null
  powerMap = null
  finished = false
  gameClient = null
  gameMap = null
  gameUIState = stateName: "select"
  gameId = /[?&]gameId=([0-9a-f]+)/.exec(window.location.search)

  if gameId isnt null
    gameId = gameId[1]
  else
    document.location = "/"

  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      client.stub.subscribeGame gameId
      populateNavigation session
      if gameId isnt null
        client.stub.gameData gameId, (response) ->
          if response.success
            document.location = "pregame.html?gameId=" + gameId  if response.game.state is "pregame"
            $("#spinner").show()
            initializeChat client, gameId
            initializeMenuControls()
            initializeGameTools()
            $("#round").text response.game.roundNumber
            if response.author
              initializeAuthorTools()
            else
              $("#authorTools").hide()
            initializeGame response.game, response.author, response.turnRemaining
          else
            alert "Error loading game!"
  
  initializeMenuControls = ->
    $("#gameStatistics").attr "href", "gamestatistics.html?gameId=" + gameId
    
  refreshFunds = ->
    client.stub.myFunds gameId, (response) ->
      if response.success
        $("#funds").text response.funds
      else
        $("#funds").text "N/A"

  initializeGameTools = ->
    $("#endTurn").click (e) ->
      e.preventDefault()
      undoMove()
      $("#spinner").show()
      client.stub.endTurn gameId, (response) ->
        unless response.success
          alert JSON.stringify(response.reason)
          $("#spinner").hide()


    $("#surrender").click (e) ->
      e.preventDefault()
      if window.confirm("Are you sure you want to SURRENDER? This means you LOSE the game.")
        $("#spinner").show()
        client.stub.surrender gameId, (response) ->
          unless response.success
            alert "Could not surrender! " + JSON.stringify(response.reason)
            $("#spinner").hide()


    $("#leaveGame").click (e) ->
      e.preventDefault()
      if window.confirm("Are you sure you want to leave the game?")
        $("#spinner").show()
        client.stub.leaveGame gameId, inTurnNumber, (response) ->
          unless response.success
            alert "Could not leave game! " + JSON.stringify(response.reason)
            $("#spinner").hide()
          else
            document.location = "mygames.html"


    client.stub.emailNotifications gameId, (response) ->
      if response.success
        $("#sendNotificationsStatus").text "off"  if response.value
      else
        $("#sendNotifications").hide()

    $("#sendNotifications").click (e) ->
      e.preventDefault()
      status = $("#sendNotifications i")
      nextValue = not status.hasClass("icon-check")
      client.stub.setEmailNotifications gameId, nextValue, (response) ->
        if response.success
          status.removeClass (if nextValue then "icon-check-empty" else "icon-check")
          status.addClass (if nextValue then "icon-check" else "icon-check-empty")
        else
          alert "Could not change email notifications setting! " + JSON.stringify(response.reason)


    speeds = [
      x: "1"
      t: "1x"
    ,
      x: "1.5"
      t: "1.5x"
    ,
      x: "2"
      t: "2x"
    ,
      x: "3"
      t: "3x"
    ,
      x: "4"
      t: "4x"
    ,
      x: "5"
      t: "5x"
    ,
      x: "0"
      t: "off"
    ]
    
    $("#animationSpeedPlus").click (e) ->
      current = $("#animationSpeed").text()

      for speed, i in speeds
        if speed.t is current
          if i < speeds.length - 1
            map.animationSpeed = speeds[i + 1].x
            map.animate = map.animationSpeed isnt 0
            $("#animationSpeed").text speeds[i + 1].t

    $("#animationSpeedMinus").click (e) ->
      current = $("#animationSpeed").text()

      for speed, i in speeds
        if speed.t is current
          if i > 0
            map.animationSpeed = speeds[i - 1].x
            map.animate = map.animationSpeed isnt 0
            $("#animationSpeed").text speeds[i - 1].t

  initializeAuthorTools = ->
  formatTime = (t) ->
    s = ""
    if t >= 60 * 60
      h = Math.floor(t / (60 * 60))
      s += 0  if h < 10
      s += h + ":"
    if t >= 60
      m = Math.floor(t / 60) % 60
      s += 0  if m < 10
      s += m + ":"
    sec = Math.ceil(t) % 60
    s += 0  if sec < 10
    s += sec
    s
    
  setMenubarToPlayerColor = (playerNumber) ->
    c = theme.getPlayerColor(inTurnNumber)
    playerColor = Color.fromRgb(c.r, c.g, c.b)
    hsl = playerColor.toHsl()
    barColor = Color.fromHsl(hsl[0], hsl[1], 0.3)
    $("#menubar").css "background-color", barColor.toString()
  initializeGame = (game, author, turnRemaining) ->
    showGame game, author, turnRemaining
    client.skeleton.gameTurnChange = (gameId, newTurn, newRound, turnRemaining) ->
      $("#round").text newRound
      inTurnNumber = newTurn
      $(".playerItem.inTurn").removeClass "inTurn"
      playerInTurn = $(".playerItem[playerNumber=\"" + inTurnNumber + "\"]")
      playerInTurn.addClass "inTurn"
      setMenubarToPlayerColor inTurnNumber
      if playerInTurn.hasClass("isMe")
        initializeTurn()
      else
        finalizeTurn()
      turnCounter = turnRemaining
      updateStatistic()

    client.skeleton.gameFinished = (gameId) ->
      $("#leaveGame").show()
      finalizeTurn()
      finished = true

    $("#mapCanvas").click handleMapClick
  showGame = (game, author, turnRemaining) ->
    $("#gameName").text game.name
    finished = game.state is "finished"
    $("#leaveGame").hide()  unless finished
    if turnRemaining is null
      $("#turnTimeItem").hide()
    else
      turnCounter = turnRemaining
      setInterval (->
        $("#turnTime").text formatTime(turnCounter)
        turnCounter = (if turnCounter > 0 then turnCounter - 1 else 0)
      ), 1000
    client.stub.profile (response) ->
      theme = new Theme(response.profile.settings.gameTheme, response.profile.settings.noHighDpi)
      theme.load ->
        updateStatistic()
        client.stub.gameRules gameId, (rules) ->
          map = new AnimatedMap("mapCanvas", 1.0, theme, rules)
          map.players = game.players
          gameLogic = new GameLogic(map, rules)
          gameMap = map
          map.doPreload ->
            inTurnNumber = game.inTurnNumber
            setMenubarToPlayerColor inTurnNumber
            initializePlayers game.players
            initializeMessageTicker()
            refreshFunds()
            map.tiles = game.tiles
            mapSize = map.getMapDimensions()
            map.resize mapSize.e(1), mapSize.e(2)
            map.refresh()
            map.initEntities()
            if not response.profile.settings.animationSpeed?
              map.animationSpeed = 1
              map.animate = true
              $("#animationSpeed").text "1x"
            else if response.profile.settings.animationSpeed > 0
              map.animationSpeed = parseFloat(response.profile.settings.animationSpeed)
              $("#animationSpeed").text response.profile.settings.animationSpeed + "x"
            else
              map.animate = false
              $("#animationSpeed").text "off"
            $("#spinner").hide()

  initializeMessageTicker = ->
    ticker = new MessageTicker($("#messageTicker"), map)
    messageTicker = $("#messageTicker")
    messageTickerContainer = $("#messageTickerContainer")
    queue = []
    client.skeleton.gameEvents = (gameId, events) ->
      processEvents = (callback) ->
        nextEvent = ->
          unless queue.length is 0
            processEvents callback
          else
            callback()
        e = queue.shift()
        e = e.content  if e.content?
        
        switch e.action 
          when "move" then map.moveUnit e.unit.unitId, e.tile.tileId, e.path, nextEvent
          when "wait" then map.waitUnit e.unit.unitId, nextEvent
          when "attack" then map.attackUnit e.attacker.unitId, e.target.unitId, e.damage, nextEvent
          when "counterattack" then map.counterattackUnit e.attacker.unitId, e.target.unitId, e.damage, nextEvent
          when "capture" then map.captureTile e.unit.unitId, e.tile.tileId, e.left, nextEvent
          when "captured" then map.capturedTile e.unit.unitId, e.tile.tileId, nextEvent
          when "deploy" then map.deployUnit e.unit.unitId, nextEvent
          when "undeploy" then map.undeployUnit e.unit.unitId, nextEvent
          when "load" then map.loadUnit e.unit.unitId, e.carrier.unitId, nextEvent
          when "unload" then map.unloadUnit e.unit.unitId, e.carrier.unitId, e.tile.tileId, nextEvent
          when "destroyed" then map.destroyUnit e.unit.unitId, nextEvent
          when "repair" then map.repairUnit e.unit.unitId, e.newHealth, nextEvent
          when "build" then map.buildUnit e.tile.tileId, e.unit, nextEvent
          when "regenerateCapturePoints" then map.regenerateCapturePointsTile e.tile.tileId, e.newCapturePoints, nextEvent
          when "produceFunds" then map.produceFundsTile e.tile.tileId, nextEvent
          when "beginTurn" then map.beginTurn e.player, nextEvent
          when "endTurn" then map.endTurn e.player, nextEvent
          when "turnTimeout" then map.turnTimeout e.player, nextEvent
          when "finished" then map.finished e.winner, nextEvent
          when "surrender" then map.surrender e.player, nextEvent
          
      alreadyProcessing = queue.length isnt 0
      queue.push event for event in events

      $("#spinner").hide()
      ticker.showMessages events
      $("#showMessageTicker").addClass "highlight"  if messageTickerContainer.css("display") is "none"
      unless alreadyProcessing
        processEvents ->


    
    #if(map.showPowerMap || map.showBorders) {
    #            map.powerMap = getPowerMap();
    #          }
    client.stub.gameEvents gameId, 0, 10, (response) ->
      unless response.success
        alert "Could not get game events! " + JSON.stringify(response.reason)
      else
        ticker.setMessages response.gameEvents, true

    $("#showHideMessageTicker").click (e) ->
      e.preventDefault()
      if messageTicker.hasClass("small")
        messageTicker.removeClass "small"
        $("#content").css "bottom", messageTickerContainer.outerHeight()
      else
        messageTicker.addClass "small"
        $("#content").css "bottom", messageTickerContainer.outerHeight()
      messageTicker.scrollTop 0

    $("#showMessageTicker").click (e) ->
      e.preventDefault()
      messageTickerContainer.toggle()
      if messageTickerContainer.css("display") is "none"
        $("#showMessageTickerStatus").text "Show"
        $("#content").css "bottom", 0
      else
        $("#showMessageTickerStatus").text "Hide"
        $("#showMessageTicker").removeClass "highlight"
        $("#content").css "bottom", messageTickerContainer.outerHeight()

    messageTicker.scroll (e) ->
      if $(this).scrollTop() + $(this).innerHeight() >= @scrollHeight - 16
        client.stub.gameEvents gameId, messageTicker.children().length, 10, (response) ->
          unless response.success
            alert "Could not get game events! " + JSON.stringify(response.reason)
          else
            ticker.showOldMessages response.gameEvents


  initializePlayers = (players) ->
    players.sort (a, b) ->
      a.playerNumber - b.playerNumber

    playerList = $("#players")
    i = 0

    playerTeams = (player.teamNumber for player in players)
    count = (item, items) -> (i for i in items when i is item).length
    counts = (count(team, playerTeams) for team in playerTeams)
    showTeams = (c for c in counts when c > 1).length > 0
    
    for player in players
      continue  if player.playerName is null
      
      item = $("<li></li>")
      number = $("<span></span>")
      name = $("<span></span>")
      item.addClass "playerItem"
      
      if player.playerNumber is inTurnNumber
        item.addClass "inTurn"
        if player.isMe and not finished
          initializeTurn player.playerNumber
        else
          finalizeTurn()
      
      item.addClass "isMe"  if player.isMe
      item.attr "playerNumber", player.playerNumber
      number.text player.playerNumber
      number.css "background-color", theme.getPlayerColorString(player.playerNumber)
      number.addClass "playerNumber"
      name.text(player.playerName) if player.playerName?
      name.addClass "playerName"
      item.append number
      item.append name
      
      if showTeams
        team = $("<span></span>")
        team.text " (#{player.teamNumber})"
        item.append team
      
      if player.isMe
        star = $("<span>★</span>")
        star.addClass "selfIndicator"
        item.append star
      
      playerList.append item

  initializeTurn = ->
    inTurn = true
    refreshFunds()
    $(".turnAction").show()
  finalizeTurn = ->
    inTurn = false
    refreshFunds()
    $(".turnAction").hide()
    
  handleMapClick = (e) ->
    return  if finished
    buildMenu = $("#buildMenu")
    canvas = $("#mapCanvas")
    content = $("#content")
    canvasPosition =
      x: e.pageX - e.currentTarget.offsetLeft
      y: e.pageY - e.currentTarget.offsetTop

    windowPosition =
      x: e.pageX
      y: e.pageY

    hexCoords = map.coordToTile(canvasPosition.x, canvasPosition.y)
    tilePosition =
      x: hexCoords.e(1)
      y: hexCoords.e(2)

    if inTurn
      buildMenu.hide()
      switch gameUIState.stateName 
        when "select" then handleSelectMapClick tilePosition, canvasPosition
        when "move" then handleMoveMapClick tilePosition, canvasPosition
        when "action" then handleActionMapClick()
        when "attack" then handleAttackMapClick tilePosition
        when "unloadUnit" then handleUnloadUnitMapClick()
        when "unloadTarget" then handleUnloadTargetMapClick tilePosition
        when "showRange" then handleShowRangeMapClick()
    else
      switch gameUIState.stateName
        when "select" then handleSelectMapClick tilePosition, canvasPosition
        when "showRange" then handleShowRangeMapClick()


  handleSelectMapClick = (tilePosition, canvasPosition) ->
    if inTurn and gameLogic.tileHasMovableUnit(inTurnNumber, tilePosition.x, tilePosition.y)
      movementOptions = gameLogic.unitMovementOptions(tilePosition.x, tilePosition.y)
      map.paintMovementMask movementOptions
      if movementOptions.length > 1
        gameUIState =
          stateName: "move"
          x: tilePosition.x
          y: tilePosition.y
          movementOptions: movementOptions
      else
        map.hideOverlay()
        switchToActionState tilePosition.x, tilePosition.y, tilePosition.x, tilePosition.y, [
          x: tilePosition.x
          y: tilePosition.y
        ], movementOptions, canvasPosition
    else if inTurn and gameLogic.tileCanBuild(inTurnNumber, tilePosition.x, tilePosition.y)
      buildOptions = gameLogic.tileBuildOptions(tilePosition.x, tilePosition.y)
      showBuildMenu buildOptions, canvasPosition, tilePosition
      
    else if map.getTile(tilePosition.x, tilePosition.y).unit isnt null
      gameUIState = stateName: "showRange"
      movementOptions = gameLogic.unitMovementOptions(tilePosition.x, tilePosition.y)
      map.paintMovementMask movementOptions

  handleMoveMapClick = (tilePosition, canvasPosition) ->
    map.refresh()
    x = gameUIState.x
    y = gameUIState.y
    dx = tilePosition.x
    dy = tilePosition.y
    canMove = false
    path = null

    for option in gameUIState.movementOptions
      if option.pos.x is dx and option.pos.y is dy
        canMove = true
        node = option
        path = [node.pos]
        while node.prev
          path.push node.prev.pos
          node = node.prev
        path.reverse()
        break

    unless canMove
      gameUIState = stateName: "select"
      map.refresh()
    else
      unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId
      map.showMoveUnit unitId, path, ->
        switchToActionState x, y, dx, dy, path, gameUIState.movementOptions, canvasPosition

  handleShowRangeMapClick = ->
    gameUIState = stateName: "select"
    map.refresh()

  handleActionMapClick = ->
    undoMove()

  handleAttackMapClick = (tilePosition) ->
    map.refresh()
    map.hideOverlay()
    tx = tilePosition.x
    ty = tilePosition.y
    canAttack = false

    for option in gameUIState.attackOptions
      if parseInt(option.pos.x) is tx and parseInt(option.pos.y) is ty
        canAttack = true
        break

    if canAttack
      unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId
      destination =
        x: gameUIState.dx
        y: gameUIState.dy

      targetId = map.getTile(tx, ty).unit.unitId
      $("#spinner").show()
      client.stub.moveAndAttack gameId, unitId, destination, gameUIState.path, targetId, (response) ->
        alert JSON.stringify(response.reason)  unless response.success
        gameUIState = stateName: "select"
    else
      undoMove()

  handleUnloadUnitMapClick = ->
    undoMove()
    
  handleUnloadTargetMapClick = (tilePosition) ->
    map.refresh()
    map.hideOverlay()
    tx = tilePosition.x
    ty = tilePosition.y
    canUnload = false

    for option in gameUIState.unloadTargetOptions
      if option.x is tx and option.y is ty
        canUnload = true
        break
        
    if canUnload
      unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId
      destination =
        x: gameUIState.dx
        y: gameUIState.dy

      carriedUnitId = gameUIState.carriedUnitId
      unloadDestination =
        x: tx
        y: ty

      $("#spinner").show()
      client.stub.moveAndUnload gameId, unitId, destination, gameUIState.path, carriedUnitId, unloadDestination, (response) ->
        alert JSON.stringify(response.reason)  unless response.success
        gameUIState = stateName: "select"
    else
      undoMove()

  undoMove = ->
    if gameUIState.stateName isnt "select"
      tile = map.getTile(gameUIState.x, gameUIState.y)
      if tile and tile.unit and gameUIState.path
        unitId = tile.unit.unitId
        gameUIState.path.reverse()
        map.showMoveUnit unitId, gameUIState.path
    gameUIState = stateName: "select"
    map.refresh()
    map.hideOverlay()
    $("#actionMenu").hide()
    $("#unloadMenu").hide()
    $("#buildMenu").hide()
    
  switchToActionState = (x, y, dx, dy, path, movementOptions, canvasPosition) ->
    gameUIState =
      stateName: "action"
      x: x
      y: y
      dx: dx
      dy: dy
      path: path

    actions = []
    if gameLogic.unitCanLoadInto(x, y, dx, dy)
      actions.push "load"
    else
      actions.push "unload"  if gameLogic.unitCanUnload(x, y, dx, dy)
      actions.push "attack"  if gameLogic.unitAttackOptions(x, y, dx, dy).length > 0
      actions.push "capture"  if gameLogic.unitCanCapture(x, y, dx, dy)
      actions.push "deploy"  if gameLogic.unitCanDeploy(x, y, dx, dy)
      actions.push "undeploy"  if gameLogic.unitCanUndeploy(x, y, dx, dy)
      actions.push "wait"  if gameLogic.unitCanWait(x, y, dx, dy)
    actions.push "cancel"
    showActionMenu actions, canvasPosition
    
  fitElement = (numItems, itemWidth, itemHeight, content) ->
    gridOptimalWidth = Math.ceil(Math.sqrt(numItems))
    gridOptimalHeight = Math.ceil(numItems / gridOptimalWidth)
    optimalWidth = itemWidth * gridOptimalWidth
    optimalHeight = itemHeight * gridOptimalHeight
    maxWidth = content.width()
    maxHeight = content.height()
    width = optimalWidth
    height = optimalHeight
    if width > maxWidth
      gridWidth = parseInt(maxWidth / itemWidth)
      gridHeight = Math.ceil(numItems / gridWidth)
      width = gridWidth * itemWidth
      height = gridHeight * itemHeight
    height = maxHeight  if height > maxHeight
    width: width
    height: height
    
  clampElement = (left, top, width, height, content) ->
    minLeft = content.scrollLeft()
    minTop = content.scrollTop()
    maxRight = content.scrollLeft() + content.width()
    maxBottom = content.scrollTop() + content.height()
    if left < minLeft
      left = minLeft
    else left = maxRight - width  if left + width > maxRight
    if top < minTop
      top = minTop
    else top = maxBottom - height  if top + height > maxBottom
    left: left
    top: top
    
  showActionMenu = (actions, canvasPosition) ->
    actionMenu = $("#actionMenu")
    content = $("#content")
    size = fitElement(actions.length, 48, 48, content)
    optimalLeft = canvasPosition.x
    optimalTop = canvasPosition.y
    position = clampElement(optimalLeft, optimalTop, size.width, size.height, content)
    actionMenu.empty()
    actionMenu.width size.width
    actionMenu.height size.height
    actionMenu.css "left", position.left
    actionMenu.css "top", position.top
    actionMenu.show()
    actionMap =
      attack:
        img: theme.getAttackIconUrl()
        name: "Attack"
        action: "attack"

      deploy:
        img: theme.getDeployIconUrl()
        name: "Deploy"
        action: "deploy"

      undeploy:
        img: theme.getUndeployIconUrl()
        name: "Undeploy"
        action: "undeploy"

      capture:
        img: theme.getCaptureIconUrl()
        name: "Capture"
        action: "capture"

      wait:
        img: theme.getWaitIconUrl()
        name: "Wait"
        action: "wait"

      load:
        img: theme.getLoadIconUrl()
        name: "Load"
        action: "load"

      unload:
        img: theme.getUnloadIconUrl()
        name: "Unload"
        action: "unload"

      cancel:
        img: theme.getCancelIconUrl()
        name: "Cancel"
        action: "cancel"

    for actionName in actions
      action = actionMap[actionName]
      item = $("<img></img>")
      item.addClass "actionItem"
      item.attr "src", action.img
      item.attr "alt", action.name
      item.attr "action", action.action
      actionMenu.append item

    $(".actionItem").click (e) ->
      resetUI = (response) ->
        alert JSON.stringify(response.reason)  unless response.success
        map.refresh()
        gameUIState = stateName: "select"
      action = $(this).attr("action")
      actionMenu.hide()
      
      switch action
        when "cancel"
          undoMove()
          
        when "attack"
          gameUIState =
            stateName: "attack"
            attackOptions: gameLogic.unitAttackOptions(gameUIState.x, gameUIState.y, gameUIState.dx, gameUIState.dy)
            x: gameUIState.x
            y: gameUIState.y
            dx: gameUIState.dx
            dy: gameUIState.dy
            path: gameUIState.path
          map.paintAttackMask gameUIState.attackOptions
          
        when "wait"
          unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId
          destination =
            x: gameUIState.dx
            y: gameUIState.dy
          $("#spinner").show()
          client.stub.moveAndWait gameId, unitId, destination, gameUIState.path, resetUI
          
        when "capture"
          unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId
          destination =
            x: gameUIState.dx
            y: gameUIState.dy
          $("#spinner").show()
          client.stub.moveAndCapture gameId, unitId, destination, gameUIState.path, resetUI
          
        when "deploy"
          unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId
          destination =
            x: gameUIState.dx
            y: gameUIState.dy
          $("#spinner").show()
          client.stub.moveAndDeploy gameId, unitId, destination, gameUIState.path, resetUI
          
        when "undeploy"
          unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId
          $("#spinner").show()
          client.stub.undeploy gameId, unitId, resetUI
          
        when "load"
          unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId
          carrierId = map.getTile(gameUIState.dx, gameUIState.dy).unit.unitId
          $("#spinner").show()
          client.stub.moveAndLoadInto gameId, unitId, carrierId, gameUIState.path, resetUI
          
        when "unload"
          gameUIState =
            stateName: "unloadUnit"
            unloadOptions: gameLogic.unitUnloadOptions(gameUIState.x, gameUIState.y, gameUIState.dx, gameUIState.dy)
            x: gameUIState.x
            y: gameUIState.y
            dx: gameUIState.dx
            dy: gameUIState.dy
            path: gameUIState.path
          showUnloadMenu gameUIState.unloadOptions, canvasPosition

  showUnloadMenu = (units, canvasPosition) ->
    unloadMenu = $("#unloadMenu")
    content = $("#content")
    size = fitElement(units.length, theme.settings.image.width + 12, theme.settings.image.height + 12, content)
    optimalLeft = canvasPosition.x
    optimalTop = canvasPosition.y
    position = clampElement(optimalLeft, optimalTop, size.width, size.height, content)
    unloadMenu.empty()
    unloadMenu.width size.width
    unloadMenu.height size.height
    unloadMenu.css "left", position.left
    unloadMenu.css "top", position.top
    unloadMenu.show()

    for unit in units
      item = $("<span></span>")
      item.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
      item.addClass "sprite"
      item.css "width", theme.settings.image.width
      item.css "height", theme.settings.image.height
      pos = theme.getUnitCoordinates(unit.type, inTurnNumber)
      item.css "background-position", -pos.x + "px " + -pos.y + "px"
      item.css "background-size", theme.getOriginalSheetSize(gameMap.sprites.width)
      item.addClass "unloadItem"
      item.attr "unitId", unit.unitId
      unloadMenu.append item

    $(".unloadItem").click (e) ->
      carriedUnitId = $(this).attr("unitId")
      unloadTargetOptions = gameLogic.unitUnloadTargetOptions(gameUIState.x, gameUIState.y, gameUIState.dx, gameUIState.dy, carriedUnitId)
      gameUIState =
        stateName: "unloadTarget"
        unloadTargetOptions: unloadTargetOptions
        carriedUnitId: carriedUnitId
        x: gameUIState.x
        y: gameUIState.y
        dx: gameUIState.dx
        dy: gameUIState.dy
        path: gameUIState.path

      map.paintUnloadMask unloadTargetOptions
      unloadMenu.hide()

  showBuildMenu = (buildOptions, canvasPosition, tilePosition) ->
    buildMenu = $("#buildMenu")
    content = $("#content")
    size = fitElement(buildOptions.length, 140, 140, content)
    optimalLeft = canvasPosition.x - size.width / 2
    optimalTop = canvasPosition.y - size.height / 2
    position = clampElement(optimalLeft, optimalTop, size.width, size.height, content)
    buildMenu.empty()
    buildMenu.width size.width
    buildMenu.height size.height
    buildMenu.css "left", position.left
    buildMenu.css "top", position.top
    buildMenu.show()

    for unitType in buildOptions
      buildItem = $("<span></span>")
      buildItem.addClass "buildItem"
      buildItem.attr "unitTypeId", unitType.id
      unitPrice = $("<span></span>")
      unitPrice.text unitType.price
      unitPrice.addClass "price"
      unitName = $("<span></span>")
      unitName.text unitType.name
      unitName.addClass "name"
      unitImage = $("<div></div>")
      unitImage.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
      unitImage.addClass "sprite"
      pos = theme.getUnitCoordinates(unitType.id, inTurnNumber)
      unitImage.css "background-position", -pos.x + "px " + -pos.y + "px"
      unitImage.css "background-size", theme.getOriginalSheetSize(gameMap.sprites.width)
      unitImage.css "width", theme.settings.image.width
      unitImage.css "height", theme.settings.image.height
      buildItem.append unitPrice
      buildItem.append unitImage
      buildItem.append unitName
      funds = parseInt($("#funds").text())
      
      if parseInt(unitType.price) <= funds
        buildItem.click ->
          unitTypeId = parseInt($(this).attr("unitTypeId"))
          $("#spinner").show()
          client.stub.build gameId, unitTypeId,{x: tilePosition.x, y: tilePosition.y}, (response) ->
            if response.success
              refreshFunds()
            else
              alert "Error building unit! " + JSON.stringify(response.reason)
            buildMenu.hide()
      else
        buildItem.addClass "disabled"
      buildMenu.append buildItem

  updateStatistic = ->
    client.stub.gameLatestStatistic gameId, (response) ->
      addChart = (container, data, property, icon) ->
        chart = container.append("div").attr("class", "statisticBarChart").attr("chartProperty", property)
        chart.append("div").attr("class", "label").append("i").attr "class", "icon-" + icon
        
        width = $(".statisticBarChart[chartProperty=\"" + property + "\"]").innerWidth() - 10
        height = 8
        totalValue = d3.sum(data, (d) ->
          d[property]
        )
        scale = d3.scale.linear().domain([0, totalValue]).range(["0px", width + "px"])
        chart.selectAll(".bar").data(data).enter().append("div").style("width", (d) ->
          foo = scale(d[property])
          foo
        ).style("height", height + "px").style("background-color", (d) ->
          theme.getPlayerColorString d.playerNumber
        ).attr("class", (d) ->
          "bar"
        ).attr "title", (d) ->
          Math.round(100 * d[property] / totalValue) + "%"

      return  if response.latestStatistic is null
      latestStatistic = response.latestStatistic
      container = d3.select("#gameStatistic")
      container.selectAll("div").remove()
      data = latestStatistic.content.sort (a, b) ->
        a.playerNumber - b.playerNumber
      
      addChart container, data, "score", "trophy"
      addChart container, data, "power", "chevron-up"
      addChart container, data, "property", "globe"

  getPowerMap = ->
    powerMap = gameLogic.getPowerMap()  if powerMap is null
    powerMap
