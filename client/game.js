var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  var gameId = /[?&]gameId=(\d+)/.exec(window.location.search);
  if(gameId !== null)
    gameId = gameId[1];
  else
    document.location = "/";
  
  var mapPainter = new Map(undefined, 1.0, "pixel");
  
  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      client.stub.subscribeGame(gameId);
  
      populateNavigation(session);
      mapPainter.canvas = $("#mapCanvas")[0];
      if(gameId !== null) {
        client.stub.gameData(gameId, function(response) {
          if(response.success) {
            if(response.game.state == "pregame") {
              document.location = "pregame.html?gameId=" + gameId;
            }
            initializeChat(client, gameId);
            initializeMenuControls();
            showGame(response);
          } else {
            alert("Error loading game!");
          }
        });
      }
    });
  });
  
  function initializeMenuControls() {
    var showGameMenu = $("#showGameMenu");
    var showMainMenu = $("#showMainMenu");
    var gameMenu = $("#gameMenu");
    var navigation = $("#navigation");
    
    showGameMenu.click(function(e) {
      e.preventDefault();
      showGameMenu.hide();
      showMainMenu.show();
      gameMenu.show();
      navigation.hide();
    });
    
    showMainMenu.click(function(e) {
      e.preventDefault();
      showGameMenu.show();
      showMainMenu.hide();
      gameMenu.hide();
      navigation.show();
    });
    
    showGameMenu.click();
  }
  
  function showGame(response) {
    $("#gameName").text(response.game.name);
    if(response.author) {
      initalizeAuthorTools();
    } else {
      $("#authorTools").hide();
    }
    
    initalizeGameTools();
    
    mapPainter.doPreload(function() {
      showPlayers(response.players, response.game.inTurnNumber, response.author);
      refreshFunds();
      mapPainter.currentTiles = response.tiles;
      var mapSize = mapPainter.getMapSize();
      var width = mapSize.w * mapPainter.tileW
      var height = mapSize.h * mapPainter.tileH
      mapPainter.canvas.width = width;
      mapPainter.canvas.height = height;
      mapPainter.refresh();
    });
    
  }
  
  function showPlayers(players, inTurn, authorMode) {
    players.sort(function(a, b) { return a.playerNumber - b.playerNumber; });
    var playerList = $("#players");
    
    for(var i = 0; i < players.length; ++i) {
      var player = players[i];
      var item = $("<li></li>");
      var number = $("<span></span>");
      var name = $("<span></span>");
      
      item.addClass("playerItem");
      if(player.playerNumber == inTurn) {
        item.addClass("inTurn");
      }
      item.attr("playerNumber", player.playerNumber);
      
      number.text(player.playerNumber);
      number.addClass("player" + player.playerNumber);
      number.addClass("playerNumber");
      
      name.text(player.playerName !== null ? player.playerName : "");
      name.addClass("playerName");
      
      item.append(number);
      item.append(name);

      playerList.append(item);
    }
  }
  
  function refreshFunds() {
    client.stub.myFunds(gameId, function(response) {
      if(response.success) {
        $("#funds").text(response.funds);
      } else {
        $("#funds").text("N/A");
      }
    });
  }
  
  function initalizeGameTools() {
    $("#endTurn").click(function(e) {
      e.preventDefault();
      client.stub.endTurn(null, function(response) {
        if(response.success) {
          
        } else {
          alert(response.reason);
        }
      });
    });
    $("#surrender").click(function(e) {
      e.preventDefault();
    });
    
    $("#showChat").click(function(e) {
      e.preventDefault();
      var chat = $("#chat");
      if(chat.css("display") == "none") {
        chat.show();
        $("#showChat").removeClass("highlight");
      } else {
        chat.hide();
      }
    });
  }
  
  function initalizeAuthorTools() {

  }
}();