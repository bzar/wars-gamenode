var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;
  var inTurn = false;
  var inTurnNumber = 0;
  var gameLogic = null;
  var gameUIState = {
    stateName: "select"
  }
  
  var gameId = /[?&]gameId=(\d+)/.exec(window.location.search);
  if(gameId !== null)
    gameId = gameId[1];
  else
    document.location = "/";
  
  var map = new Map(undefined, 1.0, "pixel");
  
  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      client.stub.subscribeGame(gameId);
  
      populateNavigation(session);
      map.canvas = $("#mapCanvas")[0];
      if(gameId !== null) {
        client.stub.gameData(gameId, function(response) {
          if(response.success) {
            if(response.game.state == "pregame") {
              document.location = "pregame.html?gameId=" + gameId;
            }
            initializeChat(client, gameId);
            initializeMenuControls();
            initializeGameTools();
            if(response.author) {
              initializeAuthorTools();
            } else {
              $("#authorTools").hide();
            }
            
            initializeGame(response.game, response.author);
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
  
  function refreshFunds() {
    client.stub.myFunds(gameId, function(response) {
      if(response.success) {
        $("#funds").text(response.funds);
      } else {
        $("#funds").text("N/A");
      }
    });
  }
  
  function initializeGameTools() {
    $("#endTurn").click(function(e) {
      e.preventDefault();
      client.stub.endTurn(gameId, function(response) {
        if(!response.success) {
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
  
  function initializeAuthorTools() {

  }
  
  function initializeGame(game, author) {
    showGame(game, author);
    
    client.skeleton.onGameTurnChange = function(gameId, newTurn) {
      inTurnNumber = newTurn;
      $(".playerItem.inTurn").removeClass("inTurn");
      var playerInTurn = $('.playerItem[playerNumber="' + inTurnNumber + '"]');
      playerInTurn.addClass("inTurn");
      if(playerInTurn.hasClass("isMe")) {
        initializeTurn();
      } else {
        finalizeTurn();
      }
    }
    
    client.skeleton.onGameUpdate = function(gameId, tileChanges) {
      for(var i = 0; i < tileChanges.length; ++i) {
        var newTile = tileChanges[i];
        var tile = map.getTile(newTile.x, newTile.y);
        if(newTile.type !== undefined)
          tile.type = newTile.type;
        
        if(newTile.subtype !== undefined)
          tile.subtype = newTile.subtype;
        
        if(newTile.owner !== undefined)
          tile.owner = newTile.owner;
        
        if(newTile.capturePoints !== undefined)
          tile.capturePoints = newTile.capturePoints;
        
        if(newTile.beingCaptured !== undefined)
          tile.beingCaptured = newTile.beingCaptured;
        
        if(newTile.unit !== undefined)
          tile.unit = newTile.unit;
      }
      map.refresh();
    }
    
    client.stub.gameRules(gameId, function(rules) {
      gameLogic = new GameLogic(map, rules);
    });
    
    $("#mapCanvas").click(function(e) {
      var buildMenu = $("#buildMenu");
      var canvas = $(this);
      var content = $("#content");
      var canvasPosition = {x: e.offsetX, y: e.offsetY};
      var windowPosition = {x: e.pageX, y: e.pageY};
      var tilePosition = {x: parseInt(canvasPosition.x / (map.getScale() * map.tileW)),
                          y: parseInt(canvasPosition.y / (map.getScale() * map.tileH))};
      
      if(inTurn) {
        buildMenu.hide();
        var playerNumber = parseInt($(".playerItem.inTurn").attr("playerNumber"));
        if(gameUIState.stateName == "select") {
          if(gameLogic.tileHasMovableUnit(playerNumber, tilePosition.x, tilePosition.y)) {
            gameUIState = {
              stateName: "move",
              x: tilePosition.x,
              y: tilePosition.y
            };
            var movementOptions = gameLogic.unitMovementOptions(tilePosition.x, tilePosition.y);
            map.paintMovementMask(movementOptions);
          } else if(gameLogic.tileCanBuild(playerNumber, tilePosition.x, tilePosition.y)) {
            var buildOptions = gameLogic.tileBuildOptions(tilePosition.x, tilePosition.y);
            showBuildMenu(buildOptions, canvasPosition, tilePosition);
          } else {

          }
        } else if(gameUIState.stateName == "move") {
          var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
          var destination = {x: tilePosition.x, y: tilePosition.y};
          client.stub.moveAndWait({gameId: gameId, unitId: unitId, destination: destination}, function(response) {
            if(!response.success) {
              alert(response.reason);
              map.refresh();
            }
          });
          gameUIState = {stateName: "select"};
        }
      }
    });
  }
  
  function showBuildMenu(buildOptions, canvasPosition, tilePosition) {
    var buildMenu = $("#buildMenu");
    var content = $("#content");
    var canvas = $("#mapCanvas");
    
    var gridOptimalWidth = Math.ceil(Math.sqrt(buildOptions.length));
    var gridOptimalHeight = parseInt(buildOptions.length / gridOptimalWidth);
    
    var itemWidth = 128;
    var itemHeight = 128;
    
    var optimalWidth = itemWidth * gridOptimalWidth;
    var optimalHeight = itemHeight * gridOptimalHeight;
    
    var maxWidth = content.width();
    var maxHeight = content.height();
    
    var width = optimalWidth;
    var height = optimalHeight;
    
    if(width > maxWidth) {
      var gridWidth = parseInt(maxWidth/itemWidth);
      var gridHeight = Math.ceil(buildOptions.length / gridWidth);
      width = gridWidth * itemWidth;
      height = gridHeight * itemHeight;
    }
    if(height > maxHeight) {
      height = maxHeight;
    }

    var optimalLeft = canvasPosition.x - width/2;
    var optimalTop = canvasPosition.y - height/2;
    
    var left = optimalLeft;
    var top = optimalTop;
    
    var minLeft = content.scrollLeft();
    var minTop = content.scrollTop();
    var maxRight = content.scrollLeft() + content.width();
    var maxBottom = content.scrollTop() + content.height();;
    
    if(left < minLeft) {
      left = minLeft;
    } else if(left + width > maxRight) {
      left = maxRight - width;
    }
    
    if(top < minTop) {
      top = minTop;
    } else if(top + height > maxBottom) {
      top = maxBottom - height;
    }
    
    var contentOffsetLeft = content.offset().left;
    var contentOffsetTop = content.offset().top;
    
    buildMenu.empty();
    buildMenu.width(width);
    buildMenu.height(height);
    buildMenu.css("left", left)
    buildMenu.css("top", top)
    buildMenu.show();
    
    for(var i = 0; i < buildOptions.length; ++i) {
      var unitType = buildOptions[i];
      var buildItem = $("<span></span>");
      buildItem.addClass("buildItem");
      buildItem.attr("unitTypeId", unitType.id);
      
      var unitPrice = $('<span></span>');
      unitPrice.text(unitType.price);
      unitPrice.addClass('price');

      var unitName = $('<span></span>');
      unitName.text(unitType.name);
      unitName.addClass('name');

      var unitImage = $('<img></img>');
      unitImage.attr("src", "/img/themes/pixel/" + SPRITE_SHEET_MAP[SPRITE_UNIT][unitType.id][inTurnNumber].img);
      unitImage.addClass('image');

      buildItem.append(unitPrice);
      buildItem.append(unitImage);
      buildItem.append(unitName);

      var funds = parseInt($("#funds").text());
      
      if(parseInt(unitType.price) <= funds) {
        buildItem.click(function() {
          var unitTypeId = parseInt($(this).attr("unitTypeId"));
          client.stub.build({gameId: gameId, unitTypeId: unitTypeId, 
                            destination: {x: tilePosition.x, y: tilePosition.y}}, 
                            function(response) {
            if(response.success) {
              refreshFunds();
            } else {
              alert("Error building unit! " + response.reason);
            }
            buildMenu.hide();
          });
        });
      } else {
        buildItem.addClass("disabled");
      }
      
      buildMenu.append(buildItem);
    }
  }
  
  function showGame(game, author) {
    $("#gameName").text(game.name);
    map.doPreload(function() {
      inTurnNumber = game.inTurnNumber;
      initializePlayers(game.players);
      refreshFunds();
      map.currentTiles = game.tiles;
      var mapSize = map.getMapSize();
      var width = mapSize.w * map.tileW
      var height = mapSize.h * map.tileH
      map.canvas.width = width;
      map.canvas.height = height;
      map.refresh();
    });
    
  }
  
  function initializePlayers(players) {
    players.sort(function(a, b) { return a.playerNumber - b.playerNumber; });
    var playerList = $("#players");
    
    for(var i = 0; i < players.length; ++i) {
      var player = players[i];
      var item = $("<li></li>");
      var number = $("<span></span>");
      var name = $("<span></span>");
      
      item.addClass("playerItem");
      if(player.playerNumber == inTurnNumber) {
        item.addClass("inTurn");
        if(player.isMe) {
          initializeTurn(player.playerNumber);
        } else {
          finalizeTurn();
        }
      }
      if(player.isMe) {
        item.addClass("isMe");
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
  
  function initializeTurn() {
    inTurn = true;
    refreshFunds();
    $("#endTurn").show();
    $("#surrender").show();
  }
  
  function finalizeTurn() {
    inTurn = false;
    refreshFunds();
    $("#endTurn").hide();
    $("#surrender").hide();
  }
}();