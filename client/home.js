var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      populateNavigation(session);
      populateMyGames(client);
      initializeChat(client);
    });
  });
  
  function populateMyGames(client) {
    client.stub.myGames(null, function(response) {
      if(!response.success) {
        alert("Error loading games!");
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
        turn.text(game.state == "pregame" ? "N/A" : game.turn);
        
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
  
  function zeroPad(str, len) {
    var s = str.toString();
    while(s.length < len) {
      s = "0" + str;
    }
    return s;
  }
  function initializeChat(client) {
    client.stub.subscribeLobbyChat();
    
    client.skeleton.chatMessage = function(messageInfo) {
      var messages = $("#chatMessages");
      var messageItem = $("<li></li>");
      var messageTime = $("<span></span>");
      var messageSender = $("<span></span>");
      var messageContent = $("<span></span>");
      
      var time = new Date(Date.parse(messageInfo.time));
      messageTime.text(zeroPad(time.getHours(), 2) + ":" + zeroPad(time.getMinutes(), 2));
      messageTime.addClass("messageTime");
      
      messageSender.text(messageInfo.sender);
      messageSender.addClass("messageSender");
      
      messageContent.text(messageInfo.content);
      messageContent.addClass("messageContent");
      
      messageItem.append(messageTime);
      messageItem.append(messageSender);
      messageItem.append(messageContent);
      
      messages.append(messageItem);
      messages.scrollTop(messages[0].scrollHeight);
    }
    
    $("#chatForm").submit(function(e) {
      e.preventDefault();
      var message = $("#chatInput").val();
      $("#chatInput").val("");
      if(message.length > 0) {
        client.stub.lobbyChat(message);
      }
    });
  }
}();

