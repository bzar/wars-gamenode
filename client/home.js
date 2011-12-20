var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, function() {
      populateNavigation(session);
      populateMyGames(client);
      initializeChat(client);
    });
  });
  
  function populateMyGames(client) {
    client.stub.myGames(null, function(response) {
      if(!response.success) {
        alert("Error loading games! " + response.reason);
        return;
      }
      
      var myGames = $("#myGames tbody");
      for(var i = 0; i < response.games.length; ++i) {
        var game = response.games[i];
        var row = $("<tr></tr>");
        var nameItem = $("<td></td>");
        var mapItem = $("<td></td>");
        var playersItem = $("<td></td>");
        var stateItem = $("<td></td>");
        var turnItem = $("<td></td>");
        var name = $("<a></a>");
        var map = $("<a></a>");
        var players = $("<a></a>");
        var state = $("<a></a>");
        var turn = $("<a></a>");
        
        name.text(game.name);
        map.text(game.map.name);
        players.text(game.state == "pregame" ? game.numPlayers + "/" + game.map.players : game.numPlayers);
        state.text(game.state);
        if(game.state == "pregame" || game.state == "finished") {
          turn.text("N/A");
        } else if(game.inTurn) {
          turn.text("Your turn!");
        } else {
          turn.text("Player " + game.inTurnNumber);
        }
        
        
        nameItem.append(name);
        mapItem.append(map);
        playersItem.append(players);
        stateItem.append(state);
        turnItem.append(turn);
        
        row.append(nameItem);
        row.append(mapItem);
        row.append(playersItem);
        row.append(stateItem);
        row.append(turnItem);
        
        $("a", row).attr("href", (game.state == "pregame" ? "/pregame.html" : "game.html") + "?gameId=" + game.gameId);
        myGames.append(row);
      }
    });
  }
}();

