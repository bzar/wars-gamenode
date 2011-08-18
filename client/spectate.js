var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      populateNavigation(session);
      populatePublicGames(client);
    });
  });
  
  function populatePublicGames(client) {
    client.stub.publicGames(null, function(response) {
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
        var gameRoundItem = $("<td></td>");
        
        var name = $("<a></a>");
        var map = $("<a></a>");
        var players = $("<a></a>");
        var gameRound = $("<a></a>");
        
        name.text(game.name);
        map.text(game.map.name);
        players.text(game.numPlayers);
        gameRound.text(game.round);
        
        nameItem.append(name);
        mapItem.append(map);
        playersItem.append(players);
        gameRoundItem.append(gameRound);
        
        row.append(nameItem);
        row.append(mapItem);
        row.append(playersItem);
        row.append(gameRoundItem);
        
        $("a", row).attr("href",  "game.html?gameId=" + game.gameId);
        
        games.append(row);
      }
    });
  }
}();
