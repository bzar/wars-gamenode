require ["Theme", "Map", "gamenode", "base"], (Theme, Map) ->
  client = new GameNodeClient(Skeleton)
  session = null
  gameId = /[?&]gameId=([0-9a-f]+)/.exec(window.location.search)
  if gameId isnt null
    gameId = gameId[1]
  else
    document.location = "/"
  theme = null
  mapPainter = null
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      client.stub.subscribeGame gameId
      populateNavigation session
      client.stub.profile (response) ->
        theme = new Theme(response.profile.settings.gameTheme)
        if gameId isnt null
          theme.load ->
            mapPainter = new Map(`undefined`, 1.0, theme)
            mapPainter.canvas = $("#mapCanvas")[0]
            client.stub.gameData gameId, (response) ->
              if response.success
                document.location = "game.html?gameId=" + gameId  unless response.game.state is "pregame"
                initializeChat client, gameId
                showGame response.game, response.author
              else
                alert "Error loading game!" + response.reason
    )


  showGame = (game, author) ->
    $("#gameName").text game.name
    if author
      initalizeAuthorTools()
    else
      $("#authorTools").hide()
      
    mapPainter.doPreload ->
      showPlayers game.players, author
      mapPainter.tiles = game.tiles
      mapSize = mapPainter.getMapDimensions()
      width = mapSize.e(1)
      height = mapSize.e(2)
      mapPainter.canvas.width = width
      mapPainter.canvas.height = height
      mapPainter.refresh()

  showPlayers = (players, authorMode) ->
    players.sort (a, b) ->
      a.playerNumber - b.playerNumber

    playerList = $("#players")

    for player in players
      do (player) ->
        item = $("<li></li>")
        number = $("<span></span>")
        name = $("<span></span>")
        item.addClass "playerItem"
        item.attr "playerNumber", player.playerNumber
        number.text player.playerNumber
        number.css "background-color", theme.getPlayerColorString(player.playerNumber)
        number.addClass "playerNumber"
        name.text (if player.playerName isnt null then player.playerName else "")
        name.addClass "playerName"
        item.append number
        item.append name
        joinButton = $("<span></span>")
        joinButton.addClass "joinButton"
        item.append joinButton
        joinButton.click ->
          if $(this).hasClass("notJoined")
            client.stub.joinGame gameId, player.playerNumber, (response) ->
              alert "Error joining game!" + response.reason  unless response.success

          else
            client.stub.leaveGame gameId, player.playerNumber, (response) ->
              alert "Error leaving game!" + response.reason  unless response.success

        if player.userId is null
          joinButton.addClass "notJoined"
          joinButton.text "Click to join!"
        else
          if player.isMe or authorMode
            joinButton.addClass "joined"
            joinButton.text "X"
          else
            joinButton.hide()
        playerList.append item

    client.skeleton.playerJoined = (gameId, playerNumber, playerName, isMe) ->
      nameLabel = $(".playerItem[playerNumber=\"" + playerNumber + "\"] .playerName")
      joinButton = $(".playerItem[playerNumber=\"" + playerNumber + "\"] .joinButton")
      nameLabel.text playerName
      joinButton.removeClass "notJoined"
      if isMe or authorMode
        joinButton.addClass "joined"
        joinButton.text "X"
      else
        joinButton.hide()

    client.skeleton.playerLeft = (gameId, playerNumber) ->
      nameLabel = $(".playerItem[playerNumber=\"" + playerNumber + "\"] .playerName")
      joinButton = $(".playerItem[playerNumber=\"" + playerNumber + "\"] .joinButton")
      joinButton.removeClass "joined"
      nameLabel.text ""
      joinButton.addClass "notJoined"
      joinButton.text "Click to join!"
      joinButton.show()

    client.skeleton.gameStarted = (gameId) ->
      document.location = "game.html?gameId=" + gameId
  initalizeAuthorTools = ->
    $("#startGame").click (e) ->
      e.preventDefault()
      client.stub.startGame gameId, (response) ->
        alert "Error starting game! " + response.reason  unless response.success


    $("#deleteGame").click (e) ->
      e.preventDefault()
      client.stub.deleteGame gameId, (response) ->
        if response.success
          document.location = "/login.html"
        else
          alert "Error deleting game! " + response.reason


    $("#inviteForm").submit (e) ->
      e.preventDefault()
      username = $("#username").val()
      if username.length > 0
        client.stub.addInvite gameId, username, (response) ->
          alert "Error inviting user! " + response.reason  unless response.success


    client.stub.botNames (names) ->
      if names is null or names is `undefined` or names.length is 0
        $("#inviteForm").hide()
      else
        i = 0

        while i < names.length
          name = names[i]
          item = $("<option></option>")
          item.attr "value", name
          item.text name
          $("#username").append item
          ++i

