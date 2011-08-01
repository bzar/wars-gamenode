var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    session = resumeSessionOrRedirect(client, undefined, "login.html", function() {
      populateNavigation(session);
      populateMyGames(client);
    });
  });
  
  function populateMyGames(client) {
    client.stub.myGames(null, function(games) {
      var myGames = $("#myGames tbody");
      for(var i = 0; i < games.length; ++i) {
        var game = games[i];
        var row = $("<tr></tr>");
        var name = $("<td></td>");
        var map = $("<td></td>");
        var players = $("<td></td>");
        var state = $("<td></td>");
        var turn = $("<td></td>");
        
        name.text(game.name);
        map.text(game.map);
        players.text(game.players);
        state.text(game.state);
        turn.text(game.turn);
        
        row.append(name);
        row.append(map);
        row.append(players);
        row.append(state);
        row.append(turn);
        myGames.append(row);
      }
    });
  }
}();

