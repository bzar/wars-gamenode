require ["Theme", "Map", "gamenode", "base"], (Theme, Map) ->
  client = new GameNodeClient(Skeleton)
  this.gameNodeClient = client
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
    session = resumeSessionOrRedirect client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
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
        item = $("<tr></tr>")
        number = $("<td></td>")
        nameContainer = $("<td></td>")
        name = $("<span></span>")
        
        item.addClass "playerItem"
        item.attr "playerNumber", player.playerNumber
        number.text player.playerNumber
        number.css "background-color", theme.getPlayerColorString(player.playerNumber)
        number.addClass "playerNumber"
        name.text(player.playerName) if player.playerName?
        name.addClass "playerName"
        
        joinButton = $("<span></span>")
        joinButton.addClass "joinButton"
        joinButton.text "Click to join!"
        
        leaveButtonContainer = $("<td></td>")
        leaveButton = $("<span></span>")
        leaveButton.addClass "leaveButton"
        leaveButton.text "X"
        
        teamContainer = $("<td></td>")
        teamSelect = $("<select></select>")
        teamSelect.addClass "teamSelect"
        teamSelect.prop("disabled", not player.isMe and not authorMode)
        
        for p in players
          option = $("<option></option>")
          option.attr "value", p.playerNumber
          option.text "Team #{p.playerNumber}"
          option.prop("selected", p.playerNumber is player.teamNumber) 
          teamSelect.append option
        
        nameContainer.append name
        nameContainer.append joinButton
        leaveButtonContainer.append leaveButton
        teamContainer.append teamSelect
        item.append number
        item.append nameContainer
        item.append teamContainer
        item.append leaveButtonContainer
        
        if player.userId is null
          joinButton.show()
          leaveButton.hide()
        else
          joinButton.hide()
          leaveButton.toggle(player.isMe or authorMode)

        joinButton.click ->
          client.stub.joinGame gameId, player.playerNumber, (response) ->
            alert "Error joining game!" + response.reason  unless response.success

        leaveButton.click ->
          client.stub.leaveGame gameId, player.playerNumber, (response) ->
            alert "Error leaving game!" + response.reason  unless response.success

        teamSelect.change ->
          teamNumber = parseInt $(this).val()
          client.stub.setTeam gameId, player.playerNumber, teamNumber, (response) ->
            alert "Error setting team!" + response.reason  unless response.success
        
        playerList.append item

    client.skeleton.playerJoined = (gameId, playerNumber, playerName, isMe) ->
      nameLabel = $(".playerItem[playerNumber=\"#{playerNumber}\"] .playerName")
      joinButton = $(".playerItem[playerNumber=\"#{playerNumber}\"] .joinButton")
      leaveButton = $(".playerItem[playerNumber=\"#{playerNumber}\"] .leaveButton")
      teamSelect = $(".playerItem[playerNumber=\"#{playerNumber}\"] .teamSelect")
      nameLabel.text playerName
      joinButton.hide()
      leaveButton.toggle(isMe or authorMode)
      teamSelect.prop "disabled", (not isMe and not authorMode)

    client.skeleton.playerLeft = (gameId, playerNumber) ->
      nameLabel = $(".playerItem[playerNumber=\"#{playerNumber}\"] .playerName")
      joinButton = $(".playerItem[playerNumber=\"#{playerNumber}\"] .joinButton")
      leaveButton = $(".playerItem[playerNumber=\"#{playerNumber}\"] .leaveButton")
      teamSelect = $(".playerItem[playerNumber=\"#{playerNumber}\"] .teamSelect")
      joinButton.removeClass "joined"
      nameLabel.text ""
      joinButton.show()
      leaveButton.hide()
      teamSelect.prop "disabled", (not authorMode)

    client.skeleton.gameStarted = (gameId) ->
      document.location = "game.html?gameId=" + gameId
      
    client.skeleton.playerTeamChanged = (gameId, playerNumber, teamNumber, playerName, isMe) ->
      teamSelect = $(".playerItem[playerNumber=\"#{playerNumber}\"] .teamSelect")
      teamSelect.val(teamNumber)
      
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
      if not names? or names.length is 0
        $("#inviteForm").hide()
      else
        for name in names
          item = $("<option></option>")
          item.attr "value", name
          item.text name
          $("#username").append item

    client.stub.gameRules gameId, (rules) ->
      populateBannedUnitSelections rules

    populateBannedUnitSelections = (rules) ->
      forEachProperty rules.units, (unit) ->
        option = $("<option id='#{unit.id}'>#{unit.name}</option>")
        if "#{unit.id}" in rules.bannedUnits  
          $("#bannedUnits").append option 
        else
          $("#notBannedUnits").append option 
   
    $("#banUnit").click (e) ->
      e.preventDefault()
      for selected in $("#notBannedUnits option:selected")
        $("#notBannedUnits").find(selected).remove
        $("#bannedUnits").append selected
      banned = $.map $("#bannedUnits option"), (option) -> option.id
      setBannedUnitsToServer(banned)

    $("#removeFromBannedUnits").click (e) ->
      e.preventDefault()
      for selected in $("#bannedUnits option:selected")
        $("#bannedUnits").find(selected).remove
        $("#notBannedUnits").append selected
      banned = $.map $("#bannedUnits option"), (option) -> option.id
      setBannedUnitsToServer(banned)

    setBannedUnitsToServer = (bannedUnits) ->
      bannedUnitsInts = (parseInt(u) for u in bannedUnits)
      client.stub.setBannedUnits gameId, bannedUnitsInts, (response) ->
        if response.success
        else
          alert "Cannot add units to ban list! " + response.reason
  

