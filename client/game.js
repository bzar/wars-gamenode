var gameClient = null;
var gameMap = null;
var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  gameClient = client;
  var session = null;
  var inTurn = false;
  var inTurnNumber = 0;
  var gameLogic = null;
  var map = new Map(undefined, 1.0, "pixel");
  gameMap = map;
  var gameUIState = {
    stateName: "select"
  }
  
  var gameId = /[?&]gameId=(\d+)/.exec(window.location.search);
  if(gameId !== null)
    gameId = gameId[1];
  else
    document.location = "/";
  
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
        
        if(newTile.unit !== undefined) {
          if(newTile.unit !== null && newTile.unit.carriedUnits === undefined && tile.unit !== null) {
            newTile.unit.carriedUnits = tile.unit.carriedUnits;
          }
          tile.unit = newTile.unit;
        }
      }
      map.refresh();
    }
    
    client.stub.gameRules(gameId, function(rules) {
      gameLogic = new GameLogic(map, rules);
    });
    
    $("#mapCanvas").click(handleMapClick);
//    $("#mapCanvas").click(function(e){console.log(e);});
  }
  
  function handleMapClick(e) {
    var buildMenu = $("#buildMenu");
    var canvas = $("#mapCanvas");
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
          var movementOptions = gameLogic.unitMovementOptions(tilePosition.x, tilePosition.y);
          map.paintMovementMask(movementOptions);
          map.paintUnit(tilePosition.x, tilePosition.y, map.getTile(tilePosition.x, tilePosition.y).unit);
          
          if(movementOptions.length > 1) {
            gameUIState = {
              stateName: "move",
              x: tilePosition.x,
              y: tilePosition.y,
              movementOptions: movementOptions
            };
          } else {
            switchToActionState(tilePosition.x, tilePosition.y, tilePosition.x, tilePosition.y, movementOptions, canvasPosition);
          }
        } else if(gameLogic.tileCanBuild(playerNumber, tilePosition.x, tilePosition.y)) {
          var buildOptions = gameLogic.tileBuildOptions(tilePosition.x, tilePosition.y);
          showBuildMenu(buildOptions, canvasPosition, tilePosition);
        } else {
          
        }
      } else if(gameUIState.stateName == "move") {
        var x = gameUIState.x;
        var y = gameUIState.y;
        var dx = tilePosition.x;
        var dy = tilePosition.y;
        var canMove = false;

        for(var i = 0; i < gameUIState.movementOptions.length; ++i) {
          var option = gameUIState.movementOptions[i];
          if(option.pos.x == dx && option.pos.y == dy) {
            canMove = true;
            break;
          }
        }
        
        if(!canMove) {
          gameUIState = {stateName: "select"};
          map.refresh();
        } else {
          switchToActionState(x, y, dx, dy, gameUIState.movementOptions, canvasPosition)
        }
      } else if(gameUIState.stateName == "action") {
        gameUIState = {stateName: "select"};
        $("#actionMenu").hide();
        map.refresh();
      } else if(gameUIState.stateName == "attack") {
        var tx = tilePosition.x;
        var ty = tilePosition.y;
        var canAttack = false;

        for(var i = 0; i < gameUIState.attackOptions.length; ++i) {
          var option = gameUIState.attackOptions[i];
          if(option.pos.x == tx && option.pos.y == ty) {
            canAttack = true;
            break;
          }
        }
        
        if(!canAttack) {
          gameUIState = {stateName: "select"};
          map.refresh();
        } else {
          var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
          var destination = {x: gameUIState.dx, y: gameUIState.dy};
          var targetId = map.getTile(tx, ty).unit.unitId;
          client.stub.moveAndAttack({gameId: gameId, unitId: unitId, destination: destination, targetId: targetId}, function(response) {
            if(!response.success) {
              alert(response.reason);
            }
            gameUIState = {stateName: "select"};
          });
        }
      } else if(gameUIState.stateName == "unloadUnit") {
        gameUIState = {stateName: "select"};
        $("#actionMenu").hide();
      } else if(gameUIState.stateName == "unloadTarget") {
        var tx = tilePosition.x;
        var ty = tilePosition.y;
        var canUndeploy = false;

        for(var i = 0; i < gameUIState.unloadTargetOptions.length; ++i) {
          var option = gameUIState.unloadTargetOptions[i];
          if(option.x == tx && option.y == ty) {
            canUndeploy = true;
            break;
          }          
        }
        
        if(!canUndeploy) {
          gameUIState = {stateName: "select"};
          map.refresh();
        } else {
          var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
          var destination = {x: gameUIState.dx, y: gameUIState.dy};
          var carriedUnitId = gameUIState.carriedUnitId;
          var unloadDestination = {x: tx, y: ty};
          client.stub.moveAndUnload({gameId: gameId, unitId: unitId, destination: destination, 
                                    carriedUnitId: carriedUnitId, unloadDestination: unloadDestination}, 
                                    function(response) {
            if(!response.success) {
              alert(response.reason);
            }
            gameUIState = {stateName: "select"};
          });
        }
      }
    }
  }
  
  function switchToActionState(x, y, dx, dy, movementOptions, canvasPosition) {
    map.paintMovementMask(movementOptions, true);
    map.paintUnit(dx, dy, map.getTile(x, y).unit);
  
    gameUIState = {
      stateName: "action",
      x: x,
      y: y,
      dx: dx,
      dy: dy
    }

    var actions = [];
    if(gameLogic.unitAttackOptions(x, y, dx, dy).length > 0)
      actions.push("attack");
    if(gameLogic.unitCanWait(x, y, dx, dy))
      actions.push("wait");
    if(gameLogic.unitCanCapture(x, y, dx, dy))
      actions.push("capture");
    if(gameLogic.unitCanDeploy(x, y, dx, dy))
      actions.push("deploy");
    if(gameLogic.unitCanUndeploy(x, y, dx, dy))
      actions.push("undeploy");
    if(gameLogic.unitCanLoadInto(x, y, dx, dy))
      actions.push("load");
    if(gameLogic.unitCanUnload(x, y, dx, dy))
      actions.push("unload");
    actions.push("cancel");
    showActionMenu(actions, canvasPosition);  
  }
  
  function fitElement(numItems, itemWidth, itemHeight, content) {
    var gridOptimalWidth = Math.ceil(Math.sqrt(numItems));
    var gridOptimalHeight = Math.ceil(numItems / gridOptimalWidth);
    
    var optimalWidth = itemWidth * gridOptimalWidth;
    var optimalHeight = itemHeight * gridOptimalHeight;
    
    var maxWidth = content.width();
    var maxHeight = content.height();
    
    var width = optimalWidth;
    var height = optimalHeight;
    
    if(width > maxWidth) {
      var gridWidth = parseInt(maxWidth/itemWidth);
      var gridHeight = Math.ceil(numItems / gridWidth);
      width = gridWidth * itemWidth;
      height = gridHeight * itemHeight;
    }
    if(height > maxHeight) {
      height = maxHeight;
    }
    
    return {width: width, height: height};
  }
  
  function clampElement(left, top, width, height, content) {
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
    
    return {left: left, top: top};
  }
  
  function showActionMenu(actions, canvasPosition) {
    var actionMenu = $("#actionMenu");
    var content = $("#content");
    var size = fitElement(actions.length, 48, 48, content);
    var optimalLeft = canvasPosition.x;
    var optimalTop = canvasPosition.y;
    var position = clampElement(optimalLeft, optimalTop, size.width, size.height, content);
    actionMenu.empty();
    actionMenu.width(size.width);
    actionMenu.height(size.height);
    actionMenu.css("left", position.left)
    actionMenu.css("top", position.top)
    actionMenu.show();
    
    var actionMap = {
      attack: {img:"/img/themes/pixel/gui/action_attack.png", name:"Attack", action:"attack"}, 
      deploy: {img:"/img/themes/pixel/gui/action_deploy.png", name:"Deploy", action:"deploy"}, 
      undeploy: {img:"/img/themes/pixel/gui/action_undeploy.png", name:"Undeploy", action:"undeploy"}, 
      capture: {img:"/img/themes/pixel/gui/action_capture.png", name:"Capture", action:"capture"}, 
      wait: {img:"/img/themes/pixel/gui/action_wait.png", name:"Wait", action:"wait"}, 
      load: {img:"/img/themes/pixel/gui/action_load.png", name:"Load", action:"load"}, 
      unload: {img:"/img/themes/pixel/gui/action_unload.png", name:"Unload", action:"unload"}, 
      cancel: {img:"/img/themes/pixel/gui/action_cancel.png", name:"Cancel", action:"cancel"}
    }

    for(var i = 0; i < actions.length; ++i) {
      var action = actionMap[actions[i]];
      var item = $("<img></img>");
      item.addClass("actionItem");
      item.attr("src", action.img);
      item.attr("alt", action.name);
      item.attr("action", action.action);
      actionMenu.append(item);
    }
    
    $(".actionItem").click(function(e) {
      var action = $(this).attr("action");
      actionMenu.hide();
      if(action == "cancel") {
        gameUIState = {stateName: "select"};
        map.refresh();
      } else if(action == "attack") {
        gameUIState = {
          stateName: "attack",
          attackOptions: gameLogic.unitAttackOptions(gameUIState.x, gameUIState.y, gameUIState.dx, gameUIState.dy),
          x: gameUIState.x,
          y: gameUIState.y,
          dx: gameUIState.dx,
          dy: gameUIState.dy
        };
        map.paintAttackMask(gameUIState.attackOptions);
        
      } else if(action == "wait") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        var destination = {x: gameUIState.dx, y: gameUIState.dy};
        client.stub.moveAndWait({gameId: gameId, unitId: unitId, destination: destination}, function(response) {
          if(!response.success) {
            alert(response.reason);
          }
          gameUIState = {stateName: "select"};
        });
      } else if(action == "capture") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        var destination = {x: gameUIState.dx, y: gameUIState.dy};
        client.stub.moveAndCapture({gameId: gameId, unitId: unitId, destination: destination}, function(response) {
          if(!response.success) {
            alert(response.reason);
          }
          gameUIState = {stateName: "select"};
        });
      } else if(action == "deploy") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        var destination = {x: gameUIState.dx, y: gameUIState.dy};
        client.stub.moveAndDeploy({gameId: gameId, unitId: unitId, destination: destination}, function(response) {
          if(!response.success) {
            alert(response.reason);
          }
          gameUIState = {stateName: "select"};
        });
      } else if(action == "undeploy") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        client.stub.undeploy({gameId: gameId, unitId: unitId}, function(response) {
          if(!response.success) {
            alert(response.reason);
          }
          gameUIState = {stateName: "select"};
        });
      } else if(action == "load") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        var carrierId = map.getTile(gameUIState.dx, gameUIState.dy).unit.unitId;
        client.stub.moveAndLoadInto({gameId: gameId, unitId: unitId, carrierId: carrierId}, function(response) {
          if(!response.success) {
            alert(response.reason);
          }
          gameUIState = {stateName: "select"};
        });
      } else if(action == "unload") {
        gameUIState = {
          stateName: "unloadUnit",
          unloadOptions: gameLogic.unitUnloadOptions(gameUIState.x, gameUIState.y, gameUIState.dx, gameUIState.dy),
          x: gameUIState.x,
          y: gameUIState.y,
          dx: gameUIState.dx,
          dy: gameUIState.dy
        };
        showUnloadMenu(gameUIState.unloadOptions, canvasPosition);
      } 
    });
  }
  
  function showUnloadMenu(units, canvasPosition) {
    var unloadMenu = $("#unloadMenu");
    var content = $("#content");
    var size = fitElement(units.length, 48, 48, content);
    var optimalLeft = canvasPosition.x;
    var optimalTop = canvasPosition.y;
    var position = clampElement(optimalLeft, optimalTop, size.width, size.height, content);
    unloadMenu.empty();
    unloadMenu.width(size.width);
    unloadMenu.height(size.height);
    unloadMenu.css("left", position.left)
    unloadMenu.css("top", position.top)
    unloadMenu.show();
    
    for(var i = 0; i < units.length; ++i) {
      var unit = units[i];
      var item = $("<img></img>");
      item.addClass("unloadItem");
      item.attr("src", "/img/themes/pixel/" + SPRITE_SHEET_MAP[SPRITE_UNIT][unit.type][inTurnNumber].img);
      item.attr("unitId", unit.unitId);
      unloadMenu.append(item);
    }
    
    $(".unloadItem").click(function(e) {
      var carriedUnitId = parseInt($(this).attr("unitId"));
      var unloadTargetOptions = gameLogic.unitUnloadTargetOptions(gameUIState.x, gameUIState.y, gameUIState.dx, 
                                                                  gameUIState.dy, carriedUnitId);
      gameUIState = {
        stateName: "unloadTarget",
        unloadTargetOptions: unloadTargetOptions,
        carriedUnitId: carriedUnitId,
        x: gameUIState.x,
        y: gameUIState.y,
        dx: gameUIState.dx,
        dy: gameUIState.dy
      };
      map.paintUnloadMask(unloadTargetOptions);
      unloadMenu.hide();
    });
  }
  
  function showBuildMenu(buildOptions, canvasPosition, tilePosition) {
    var buildMenu = $("#buildMenu");
    var content = $("#content");
    
    var size = fitElement(buildOptions.length, 128, 128, content);
    var optimalLeft = canvasPosition.x - size.width/2;
    var optimalTop = canvasPosition.y - size.height/2;
    var position = clampElement(optimalLeft, optimalTop, size.width, size.height, content);
    
    buildMenu.empty();
    buildMenu.width(size.width);
    buildMenu.height(size.height);
    buildMenu.css("left", position.left)
    buildMenu.css("top", position.top)
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