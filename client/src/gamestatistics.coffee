require ["Theme", "gamenode", "base", "lib/d3/d3"], (Theme) ->
  client = new GameNodeClient(Skeleton)
  session = null
  theme = null
  gameId = /[?&]gameId=([0-9a-f]+)/.exec(window.location.search)
  if gameId isnt null
    gameId = gameId[1]
  else
    document.location = "/"
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      populateNavigation session
      $("#backToGame").attr "href", "game.html?gameId=" + gameId
      initialize client
    )

  initialize = (client) ->
    client.stub.profile (response) ->
      theme = new Theme(response.profile.settings.gameTheme)
      theme.load ->
        client.stub.gameData gameId, (response) ->
          unless response.success
            alert "Error loading game! " + response.reason
            return
          game = response.game
          $("#gameTitle").text game.name
          client.stub.gameStatistics gameId, (response) ->
            unless response.success
              alert "Error loading game! " + response.reason
              return
            data = response.gameStatistics
            parsedData = parseStatisticData(data)
            drawGraph parsedData, "score", "#scoreChart"
            drawGraph parsedData, "power", "#powerChart"
            drawGraph parsedData, "property", "#propertyChart"




  drawGraph = (parsedData, statName, selector) ->
    w = Math.max(400, Math.min(3 * $(selector).innerWidth() / 4, parsedData.max.turn * 50))
    h = 400
    marginLeft = 50
    marginBottom = 20
    y = d3.scale.linear()
      .domain([0, parsedData.max[statName]])
      .range([marginBottom, h - marginBottom]).nice()
    x = d3.scale.linear()
      .domain([0, parsedData.max.turn])
      .range([marginLeft, w - marginLeft])
    vis = d3.select(selector).append("svg:svg")
      .attr("width", w + 1)
      .attr("height", h)
    vis.append("svg:rect")
      .style("stroke", "#111")
      .style("fill", "#e8e8e8")
      .attr("x", marginLeft)
      .attr("y", 0)
      .attr("width", w - marginLeft)
      .attr("height", h - marginBottom)
      
    g = vis.append("svg:g")
      .attr("transform", "translate(0, " + h + ")")

    for playerNumber, i in parsedData.players
      line = d3.svg.line()
        .x((d) -> x d.turnNumber)
        .y((d) -> -1 * y(d[statName]))
        
      playerColor = theme.getPlayerColorString(playerNumber)
      c = g.append("svg:g")
      c.append("svg:path")
        .attr("d", line(parsedData.data[playerNumber].byRound))
        .style("stroke", playerColor)
        .style("fill", "none")
        
      c.selectAll("circle")
        .data(parsedData.data[playerNumber].byTurn)
        .enter().append("svg:circle")
          .attr("cx", (d) -> x d.turnNumber)
          .attr("cy", (d) -> -1 * y(d[statName]))
          .attr("r", 3)
          .style("stroke", playerColor)
          .style("fill", playerColor)
      
    g.selectAll(".xLabel")
      .data(x.ticks(5))
      .enter().append("svg:text")
        .attr("class", "xLabel")
        .text((i) -> if i isnt 0 then String i else "")
        .attr("x", (d) -> x d)
        .attr("y", -2)
        .attr("text-anchor", "middle")
        
    g.selectAll(".yLabel")
      .data(y.ticks(4))
      .enter().append("svg:text")
        .attr("class", "yLabel")
        .text(String).attr("x", 0)
        .attr("y", (d) -> -1 * y(d))
        .attr("text-anchor", "right")
        .attr("dy", 4)
        
  parseStatisticData = (data) ->
    data.sort (a, b) ->
      return 0  if a.turnNumber is b.turnNumber
      (if a.turnNumber < b.turnNumber then -1 else 1)

    result = {}
    players = []
    lastRoundNumber = 0
    roundTurnNumber = 1
    maxTurn = 0
    maxRound = 0
    maxScore = 0
    maxPower = 0
    maxProperty = 0

    for turnData, i in data
      roundChange = lastRoundNumber isnt turnData.roundNumber
      maxTurn = Math.max(maxTurn, turnData.turnNumber)
      maxRound = Math.max(maxRound, turnData.roundNumber)

      for playerData, j in turnData.content
        playerNumber = playerData.playerNumber
        players.push playerNumber  if players.indexOf(playerNumber) is -1
        if playerNumber not of result
          result[playerNumber] =
            byTurn: []
            byRound: [
              turnNumber: turnData.turnNumber
              roundNumber: turnData.roundNumber
              score: playerData.score
              power: playerData.power
              property: playerData.property
            ]
        playerResults = result[playerNumber]
        playerResults.byTurn.push
          turnNumber: turnData.turnNumber
          score: playerData.score
          power: playerData.power
          property: playerData.property

        maxScore = Math.max(maxScore, playerData.score)
        maxPower = Math.max(maxPower, playerData.power)
        maxProperty = Math.max(maxProperty, playerData.property)
        roundStatistics = playerResults.byRound[playerResults.byRound.length - 1]
        
        if roundChange or i is data.length - 1
          roundStatistics.score /= roundTurnNumber
          roundStatistics.power /= roundTurnNumber
          roundStatistics.property /= roundTurnNumber
          roundStatistics.turnNumber = turnData.turnNumber - 1
          roundStatistics =
            turnNumber: turnData.turnNumber
            roundNumber: turnData.roundNumber
            score: 0
            power: 0
            property: 0

          playerResults.byRound.push roundStatistics
        roundStatistics.score += playerData.score
        roundStatistics.power += playerData.power
        roundStatistics.property += playerData.property
        
      roundTurnNumber = (if roundChange then 1 else roundTurnNumber + 1)
      lastRoundNumber = turnData.roundNumber
      
    data: result
    players: players
    max:
      turn: maxTurn
      round: maxRound
      score: maxScore
      power: maxPower
      property: maxProperty


