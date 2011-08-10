var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      populateNavigation(session);
      populateOpenGames(client);
    });
  });
  
  function populateOpenGames(client) {
    client.stub.openGames(null, function(response) {
      if(!response.success) {
        alert("Error loading games! " + response.reason);
        return
      }
      
      var games = $("#games tbody");
      for(var i = 0; i < response.games.length; ++i) {
        var game = response.games[i];
        var row = $("<tr></tr>");
        var nameItem = $("<td></td>");
        var mapItem = $("<td></td>");
        var playersItem = $("<td></td>");
        var name = $("<a></a>");
        var map = $("<a></a>");
        var players = $("<a></a>");
        
        name.text(game.name);
        map.text(game.map.name);
        players.text(game.numPlayers + "/" + game.map.players);
        
        nameItem.append(name);
        mapItem.append(map);
        playersItem.append(players);
        
        row.append(nameItem);
        row.append(mapItem);
        row.append(playersItem);
        
        $("a", row).attr("href", (game.state == "pregame" ? "/pregame.html" : "game.html") + "?gameId=" + game.gameId);
        
        games.append(row);
      }
    });
  }
}();
