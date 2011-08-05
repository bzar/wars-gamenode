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
            if(response.game.state != "pregame") {
              document.location = "game.html?gameId=" + gameId;
            }
            showGame(response);
          } else {
            alert("Error loading game!");
          }
        });
      }
    });
  });
  
 
  function showGame(response) {
    $("#gameName").text(response.game.name);
    if(response.author) {
      initalizeAuthorTools();
    } else {
      $("#authorTools").hide();
    }
    
    mapPainter.doPreload(function() {
      showPlayers(response.players, response.author);
      
      mapPainter.currentTiles = response.tiles;
      var mapSize = mapPainter.getMapSize();
      var width = mapSize.w * mapPainter.tileW
      var height = mapSize.h * mapPainter.tileH
      mapPainter.canvas.width = width;
      mapPainter.canvas.height = height;
      mapPainter.refresh();
    });
    
  }
  
  function showPlayers(players, authorMode) {
    players.sort(function(a, b) { return a.playerNumber - b.playerNumber; });
    var playerList = $("#players");
    
    for(var i = 0; i < players.length; ++i) {
      var player = players[i];
      var item = $("<li></li>");
      var number = $("<span></span>");
      var name = $("<span></span>");
      
      item.addClass("playerItem");
      item.attr("playerNumber", player.playerNumber);
      
      number.text(player.playerNumber);
      number.addClass("player" + player.playerNumber);
      number.addClass("playerNumber");
      
      name.text(player.playerName !== null ? player.playerName : "");
      name.addClass("playerName");
      
      item.append(number);
      item.append(name);

      var joinButton = $("<span></span>");
      joinButton.addClass("joinButton");
      item.append(joinButton);
      
      var hack = function(playerNumber) {
        joinButton.click(function() {
          if($(this).hasClass("notJoined")) {
            client.stub.joinGame({gameId: gameId, playerNumber: playerNumber}, function(response) {
              if(response.success) {
                
              } else {
                alert("Error joining game!");
              }
            });
          } else {
            client.stub.leaveGame({gameId: gameId, playerNumber: playerNumber}, function(response) {
              if(response.success) {
                
              } else {
                alert("Error leaving game!");
              }
            });              
          }
        });
      }(player.playerNumber);

      if(player.userId === null) {
        joinButton.addClass("notJoined");
        joinButton.text("Click to join!");
      } else {
        if(player.isMe || authorMode) {
          joinButton.addClass("joined");
          joinButton.text("X");
        } else {
          joinButton.hide();
        }
      }
      
      playerList.append(item);
    }
    
    
    client.skeleton.playerJoined = function(playerInfo) {
      var playerName = $('.playerItem[playerNumber="' + playerInfo.number + '"] .playerName');
      var playerNumber = $('.playerItem[playerNumber="' + playerInfo.number + '"] .joinButton');
      var joinButton = $('.playerItem[playerNumber="' + playerInfo.number + '"] .joinButton');
      playerName.text(playerInfo.name)
      joinButton.removeClass("notJoined");
      if(playerInfo.isMe || authorMode) {
          joinButton.addClass("joined");
          joinButton.text("X");        
      } else {
        joinButton.hide();
      }
    }
    
    client.skeleton.playerLeft = function(playerInfo) {
      var playerName = $('.playerItem[playerNumber="' + playerInfo.number + '"] .playerName');
      var playerNumber = $('.playerItem[playerNumber="' + playerInfo.number + '"] .joinButton');
      var joinButton = $('.playerItem[playerNumber="' + playerInfo.number + '"] .joinButton');
      joinButton.removeClass("joined");
      playerName.text("")
      joinButton.addClass("notJoined");
      joinButton.text("Click to join!");
      joinButton.show();
    }
  }
  
  function initalizeAuthorTools() {
      $("#startGame").click(function(e) {
        e.preventDefault();
        client.stub.startGame(gameId, function(response) {
          if(response.success) {
            
          } else {
            alert("Error starting game! " + response.reason);
          }
        });
      });
      $("#deleteGame").click(function(e) {
        e.preventDefault();
        client.stub.deleteGame(gameId, function(response) {
          if(response.success) {
            document.location = "/home.html";
          } else {
            alert("Error deleting game! " + response.reason);
          }
        });
      });

  }
  
  function makeObj(id, arr) {
    var obj = {};
    arr.forEach(function(i) {
      obj[i[id]] = i;
    });
    return obj;
  }
}();