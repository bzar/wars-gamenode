// Generated by CoffeeScript 1.4.0
(function() {

  require(["Theme", "gamenode", "base", "lib/d3/d3"], function(Theme) {
    var client, drawGraph, gameId, initialize, parseStatisticData, session, theme;
    client = new GameNodeClient(Skeleton);
    session = null;
    theme = null;
    gameId = /[?&]gameId=([0-9a-f]+)/.exec(window.location.search);
    if (gameId !== null) {
      gameId = gameId[1];
    } else {
      document.location = "/";
    }
    $(document).ready(function() {
      var loginUrl;
      loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
      return session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, function() {
        populateNavigation(session);
        $("#backToGame").attr("href", "game.html?gameId=" + gameId);
        return initialize(client);
      });
    });
    initialize = function(client) {
      return client.stub.profile(function(response) {
        theme = new Theme(response.profile.settings.gameTheme);
        return theme.load(function() {
          return client.stub.gameData(gameId, function(response) {
            var game;
            if (!response.success) {
              alert("Error loading game! " + response.reason);
              return;
            }
            game = response.game;
            $("#gameTitle").text(game.name);
            return client.stub.gameStatistics(gameId, function(response) {
              var data, parsedData;
              if (!response.success) {
                alert("Error loading game! " + response.reason);
                return;
              }
              data = response.gameStatistics;
              parsedData = parseStatisticData(data);
              drawGraph(parsedData, "score", "#scoreChart");
              drawGraph(parsedData, "power", "#powerChart");
              return drawGraph(parsedData, "property", "#propertyChart");
            });
          });
        });
      });
    };
    drawGraph = function(parsedData, statName, selector) {
      var c, g, h, i, line, marginBottom, marginLeft, playerColor, playerNumber, vis, w, x, y, _i, _len, _ref;
      w = Math.max(400, Math.min(3 * $(selector).innerWidth() / 4, parsedData.max.turn * 50));
      h = 400;
      marginLeft = 50;
      marginBottom = 20;
      y = d3.scale.linear().domain([0, parsedData.max[statName]]).range([marginBottom, h - marginBottom]).nice();
      x = d3.scale.linear().domain([0, parsedData.max.turn]).range([marginLeft, w - marginLeft]);
      vis = d3.select(selector).append("svg:svg").attr("width", w + 1).attr("height", h);
      vis.append("svg:rect").style("stroke", "#111").style("fill", "#e8e8e8").attr("x", marginLeft).attr("y", 0).attr("width", w - marginLeft).attr("height", h - marginBottom);
      g = vis.append("svg:g").attr("transform", "translate(0, " + h + ")");
      _ref = parsedData.players;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        playerNumber = _ref[i];
        line = d3.svg.line().x(function(d) {
          return x(d.turnNumber);
        }).y(function(d) {
          return -1 * y(d[statName]);
        });
        playerColor = theme.getPlayerColorString(playerNumber);
        c = g.append("svg:g");
        c.append("svg:path").attr("d", line(parsedData.data[playerNumber].byRound)).style("stroke", playerColor).style("fill", "none");
        c.selectAll("circle").data(parsedData.data[playerNumber].byTurn).enter().append("svg:circle").attr("cx", function(d) {
          return x(d.turnNumber);
        }).attr("cy", function(d) {
          return -1 * y(d[statName]);
        }).attr("r", 3).style("stroke", playerColor).style("fill", playerColor);
      }
      g.selectAll(".xLabel").data(x.ticks(5)).enter().append("svg:text").attr("class", "xLabel").text(function(i) {
        if (i !== 0) {
          return String(i);
        } else {
          return "";
        }
      }).attr("x", function(d) {
        return x(d);
      }).attr("y", -2).attr("text-anchor", "middle");
      return g.selectAll(".yLabel").data(y.ticks(4)).enter().append("svg:text").attr("class", "yLabel").text(String).attr("x", 0).attr("y", function(d) {
        return -1 * y(d);
      }).attr("text-anchor", "right").attr("dy", 4);
    };
    return parseStatisticData = function(data) {
      var i, j, lastRoundNumber, maxPower, maxProperty, maxRound, maxScore, maxTurn, playerData, playerNumber, playerResults, players, result, roundChange, roundStatistics, roundTurnNumber, turnData, _i, _j, _len, _len1, _ref;
      data.sort(function(a, b) {
        if (a.turnNumber === b.turnNumber) {
          return 0;
        }
        if (a.turnNumber < b.turnNumber) {
          return -1;
        } else {
          return 1;
        }
      });
      result = {};
      players = [];
      lastRoundNumber = 0;
      roundTurnNumber = 1;
      maxTurn = 0;
      maxRound = 0;
      maxScore = 0;
      maxPower = 0;
      maxProperty = 0;
      for (i = _i = 0, _len = data.length; _i < _len; i = ++_i) {
        turnData = data[i];
        roundChange = lastRoundNumber !== turnData.roundNumber;
        maxTurn = Math.max(maxTurn, turnData.turnNumber);
        maxRound = Math.max(maxRound, turnData.roundNumber);
        _ref = turnData.content;
        for (j = _j = 0, _len1 = _ref.length; _j < _len1; j = ++_j) {
          playerData = _ref[j];
          playerNumber = playerData.playerNumber;
          if (players.indexOf(playerNumber) === -1) {
            players.push(playerNumber);
          }
          if (!(playerNumber in result)) {
            result[playerNumber] = {
              byTurn: [],
              byRound: [
                {
                  turnNumber: turnData.turnNumber,
                  roundNumber: turnData.roundNumber,
                  score: playerData.score,
                  power: playerData.power,
                  property: playerData.property
                }
              ]
            };
          }
          playerResults = result[playerNumber];
          playerResults.byTurn.push({
            turnNumber: turnData.turnNumber,
            score: playerData.score,
            power: playerData.power,
            property: playerData.property
          });
          maxScore = Math.max(maxScore, playerData.score);
          maxPower = Math.max(maxPower, playerData.power);
          maxProperty = Math.max(maxProperty, playerData.property);
          roundStatistics = playerResults.byRound[playerResults.byRound.length - 1];
          if (roundChange || i === data.length - 1) {
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
        roundTurnNumber = (roundChange ? 1 : roundTurnNumber + 1);
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
    };
  });

}).call(this);