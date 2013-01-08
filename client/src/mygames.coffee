require ["gamenode", "base"], ->

  client = new GameNodeClient(Skeleton)
  session = null
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      populateNavigation session
      populateMyGames client
      initializeChat client
    )


  populateMyGames = (client) ->
    client.stub.myGames null, (response) ->
      unless response.success
        alert "Error loading games! " + response.reason
        return
      myGames = $("#myGames tbody")
      i = 0

      while i < response.games.length
        game = response.games[i]
        row = $("<tr></tr>")
        nameItem = $("<td></td>")
        mapItem = $("<td></td>")
        playersItem = $("<td></td>")
        stateItem = $("<td></td>")
        turnItem = $("<td></td>")
        name = $("<a></a>")
        map = $("<a></a>")
        players = $("<a></a>")
        state = $("<a></a>")
        turn = $("<a></a>")
        name.text game.name
        map.text game.map.name
        players.text (if game.state is "pregame" then game.numPlayers + "/" + game.map.players else game.numPlayers)
        state.text game.state
        if game.state is "pregame" or game.state is "finished"
          turn.text "N/A"
        else if game.inTurn
          turn.text "Your turn!"
        else
          turn.text "Player " + game.inTurnNumber
        nameItem.append name
        mapItem.append map
        playersItem.append players
        stateItem.append state
        turnItem.append turn
        row.append nameItem
        row.append mapItem
        row.append playersItem
        row.append stateItem
        row.append turnItem
        $("a", row).attr "href", ((if game.state is "pregame" then "/pregame.html" else "game.html")) + "?gameId=" + game.gameId
        myGames.append row
        ++i
