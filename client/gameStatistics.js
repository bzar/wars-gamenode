require(["jquery-1.6.2.min.js", "/socket.io/socket.io.js", "/gamenode/gameNodeClient.js", "/gamenode/session.js", 
        "skeleton", "settings", "base", "theme", "d3/d3"], function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;
  var theme = null;
  
  var gameId = /[?&]gameId=([0-9a-f]+)/.exec(window.location.search);
  if(gameId !== null)
    gameId = gameId[1];
  else
    document.location = "/";
  
  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, function() {
      populateNavigation(session);
      $("#backToGame").attr("href", "game.html?gameId=" + gameId);
      initialize(client);
    });
  });
  
  function initialize(client) {
    client.stub.profile(function(response) {
      theme = new Theme(response.profile.settings.gameTheme);
      theme.load(function() {
        client.stub.gameData(gameId, function(response) {
          if(!response.success) { alert("Error loading game! " + response.reason); return; }
          var game = response.game;
          $("#gameTitle").text(game.name);
          client.stub.gameStatistics(gameId, function(response) {
            if(!response.success) { alert("Error loading game! " + response.reason); return; }
            var data = response.gameStatistics;
            var parsedData = parseStatisticData(data);
            
            drawGraph(parsedData, "score", "#scoreChart");
            drawGraph(parsedData, "power", "#powerChart");
            drawGraph(parsedData, "property", "#propertyChart");
          });
        });
      });
    });
  }
  
  function drawGraph(parsedData, statName, selector) {
    var w = Math.max(400, Math.min(3*$(selector).innerWidth()/4, parsedData.max.turn*50));
    var h = 400;
    var marginLeft = 50;
    var marginBottom = 20;
    var y = d3.scale.linear().domain([0, parsedData.max[statName]]).range([marginBottom, h-marginBottom]).nice();
    var x = d3.scale.linear().domain([0, parsedData.max.turn]).range([marginLeft, w-marginLeft]);

    var vis = d3.select(selector)
      .append("svg:svg")
      .attr("width", w+1)
      .attr("height", h)

    vis.append("svg:rect")
      .style("stroke", "#111")
      .style("fill", "#e8e8e8")
      .attr("x", marginLeft)
      .attr("y", 0)
      .attr("width", w-marginLeft)
      .attr("height", h-marginBottom)

    var g = vis.append("svg:g")
      .attr("transform", "translate(0, " + h + ")");

    for(var i = 0; i < parsedData.players.length; ++i) {
      var playerNumber = parsedData.players[i];
      var line = d3.svg.line()
        .x(function(d) { return x(d.turnNumber); })
        .y(function(d) { return -1 * y(d[statName]); });

      var playerColor = theme.getPlayerColorString(playerNumber);
      var c = g.append("svg:g");
      c.append("svg:path")
        .attr("d", line(parsedData.data[playerNumber].byRound))
        .style("stroke", playerColor)
        .style("fill", "none");

      c.selectAll("circle")
        .data(parsedData.data[playerNumber].byTurn)
        .enter().append("svg:circle")
          .attr("cx", function(d) { return x(d.turnNumber); })
          .attr("cy", function(d) { return -1 * y(d[statName]); })
          .attr("r", 3)
          .style("stroke", playerColor)
          .style("fill", playerColor)
    }

    g.selectAll(".xLabel")
      .data(x.ticks(5))
      .enter().append("svg:text")
      .attr("class", "xLabel")
      .text(function(i){return String(i+1);})
      .attr("x", function(d) { return x(d) })
      .attr("y", -2)
      .attr("text-anchor", "middle")

    g.selectAll(".yLabel")
      .data(y.ticks(4))
      .enter().append("svg:text")
      .attr("class", "yLabel")
      .text(String)
      .attr("x", 0)
      .attr("y", function(d) { return -1 * y(d) })
      .attr("text-anchor", "right")
      .attr("dy", 4)
  }
  
  function parseStatisticData(data) {
    var result = {};
    var players = [];
    var lastRoundNumber = 0;
    var roundTurnNumber = 1;
    var maxTurn = 0;
    var maxRound = 0;
    var maxScore = 0;
    var maxPower = 0;
    var maxProperty = 0;
    
    for(var i = 0; i < data.length; ++i) {
      var turnData = data[i];
      var roundChange = lastRoundNumber != turnData.roundNumber;
      
      maxTurn = Math.max(maxTurn, turnData.turnNumber);
      maxRound = Math.max(maxRound, turnData.roundNumber);
      
      for(var j = 0; j < turnData.content.length; ++j) {
        var playerData = turnData.content[j];
        var playerNumber = playerData.playerNumber;
        if(players.indexOf(playerNumber) == -1) players.push(playerNumber);
        if(result[playerNumber] === undefined) {
          result[playerNumber] = {
            byTurn: [],
            byRound: [{turnNumber: turnData.turnNumber, roundNumber: turnData.roundNumber, 
                       score: playerData.score, power: playerData.power, property: playerData.property}]
          };
        }
        var playerResults = result[playerNumber];
        playerResults.byTurn.push({
          turnNumber: turnData.turnNumber, 
          score: playerData.score,
          power: playerData.power,
          property: playerData.property
        });

        maxScore = Math.max(maxScore, playerData.score);
        maxPower = Math.max(maxPower, playerData.power);
        maxProperty = Math.max(maxProperty, playerData.property);
        
        var roundStatistics = playerResults.byRound[playerResults.byRound.length - 1];
        
        if(roundChange || i == data.length - 1) {
          roundStatistics.score /= roundTurnNumber;
          roundStatistics.power /= roundTurnNumber;
          roundStatistics.property /= roundTurnNumber;
          roundStatistics.turnNumber = turnData.turnNumber - 1;
          roundStatistics = {
            turnNumber: turnData.turnNumber, 
            roundNumber: turnData.roundNumber, 
            score: 0,
            power: 0,
            property: 0
          };
          playerResults.byRound.push(roundStatistics);
        }
        
        roundStatistics.score += playerData.score;
        roundStatistics.power += playerData.power;
        roundStatistics.property += playerData.property;
      }
      roundTurnNumber = roundChange ? 1 : roundTurnNumber + 1;
      lastRoundNumber = turnData.roundNumber;      
    }
    
    return {
      data: result, 
      players: players,
      max: {
        turn: maxTurn, 
        round: maxRound, 
        score: maxScore, 
        power: maxPower, 
        property: maxProperty
      }
    };
  }
});

