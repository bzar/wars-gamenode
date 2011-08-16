var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  var lastMapId = null;
  var mapId = /[?&]mapId=(\d+)/.exec(window.location.search);
  if(mapId !== null)
    mapId = mapId[1];
  
  var mapPainter = new Map(undefined, undefined, "pixel");
  
  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      initializeControls();
      populateNavigation(session);
      
      mapPainter.doPreload(function() {
        if(mapId === null) {
          showMaps();
        } else {
          showFullMapPreview();
        }
      });
    });
  });
  
  function initializeControls() {
    $("#turnTimeLimit").change(function() {
      if($(this).prop("checked")) {
        $("#timeLimitInput").show();
      } else {
        $("#timeLimitInput").hide();
      }
    });
    $("#turnTimeLimit").change();
    
    $("#backToMaps").click(function(e) {
      e.preventDefault();
      showMaps();
    });
    $("#backToMapPreview").click(function(e) {
      e.preventDefault();
      showFullMapPreview();
    });
    $("#toGameSettings").click(function(e) {
      e.preventDefault();
      showGameSettings();
    });
    $("#createGame").click(function(e) {
      e.preventDefault();
      createGame();
    });

  }
  
  function createGame() {
      var name = $("#gameName").val();
      var publicGame = $("#publicGame").prop("checked");
      var limitTurnTime = $("#turnTimeLimit").prop("checked");
      var hourLimitStr = $("#hourLimit").val();
      var minuteLimitStr = $("#minuteLimit").val();
      var secondLimitStr = $("#secondLimit").val();
      var hourLimit = parseInt(hourLimitStr ? hourLimitStr : 0, 10);
      var minuteLimit = parseInt(minuteLimitStr ? minuteLimitStr : 0, 10);
      var secondLimit = parseInt(secondLimitStr ? secondLimitStr : 0, 10);
      var turnLength = null;
      if(limitTurnTime && !isNaN(hourLimit) && !isNaN(minuteLimit) && !isNaN(secondLimit)) {
        turnLength = (hourLimit * 60 + minuteLimit) * 60 + secondLimit;
        turnLength = turnLength ? turnLength : null;
      }
      client.stub.createGame(name, mapId, publicGame, turnLength, function(response) {
        if(response.success) {
          document.location = "/pregame.html?gameId=" + response.gameId;
        } else {
          alert("Error creating game! " + response.reason);
        }
      });
  }
  
  function showMaps() {
      if($("#maps:empty").length != 0)
        populateMaps(client);
    $("#mapSelection").show();
    $("#mapFullPreview").hide();
    $("#gameSettings").hide();
    $("#navigation").show();
    $("#mapPreviewControls").hide();
    $("#createGameControls").hide();
    if(document.location.search.length != 0)
      history.pushState(undefined, undefined, document.location.pathname);
  }
  
  function showFullMapPreview() {
    if(lastMapId != mapId) {
      client.stub.mapData(mapId, function(response) {
        var mapData = response.mapData;
        populateMapInfo(response);
        populateMapTileStats(mapData);
        var canvas = $("#mapCanvas");
        mapPainter.canvas = canvas[0];
        mapPainter.currentTiles = mapData;
        var mapSize = mapPainter.getMapSize();
        var width = mapSize.w * mapPainter.tileW
        var height = mapSize.h * mapPainter.tileH
        canvas.attr("width", width);
        canvas.attr("height", height);
        mapPainter.refresh();
      });
    }
    $("#mapSelection").hide();
    $("#mapFullPreview").show();
    $("#gameSettings").hide();
    $("#navigation").hide();
    $("#mapPreviewControls").show();
    $("#createGameControls").hide();
    history.pushState(undefined, undefined, document.location.pathname + "?mapId=" + mapId);
    lastMapId = mapId;
  }
  function showGameSettings() {
    $("#mapSelection").hide();
    $("#mapFullPreview").hide();
    $("#gameSettings").show();
    $("#navigation").hide();
    $("#mapPreviewControls").hide();
    $("#createGameControls").show();
  }
  
  function populateMaps(client) {
    client.stub.maps(null, function(response) {
      var maps = response.maps;
      var mapList = $("#maps");
      for(var i = 0; i < maps.length; ++i) {
        var map = maps[i];
        var container = $("<a></a>");
        var name = $("<div></div>");
        var preview = $("<div></div>");
        var funds = $("<div></div>");
        var players = $("<div></div>");
        
        var previewCanvas = $("<canvas></canvas>");
        previewCanvas.text("Preview of " + map.name);
        previewCanvas.addClass("mapThumbnail");
        previewCanvas.attr("width", 200);
        previewCanvas.attr("height", 200);
        preview.append(previewCanvas);
        
        name.text(map.name);
        name.addClass("name");
        funds.text("Initial funds: " + map.funds);
        funds.addClass("info");
        players.text("Max players: " + map.players);
        players.addClass("info");
        
        container.append(name);
        container.append(preview);
        container.append(funds);
        container.append(players);
        container.attr("mapId", map.mapId);

        container.addClass("mapContainer");
        container.click(function(e) {
          e.preventDefault();
          $(".mapContainer").removeClass("selected");
          mapId = $(this).attr("mapId");
          showFullMapPreview();
        });
        
        mapList.append(container);
        
        var hack2 = function(canvas, mapId) {
          client.stub.mapData(mapId, function(response) {
            var mapData = response.mapData;
            mapPainter.canvas = canvas;
            mapPainter.currentTiles = mapData;
            mapPainter.refresh();
          });
        }(previewCanvas[0], map.mapId);
      }        
    });
  }
  
  function populateMapInfo(map) {
    var mapInfo = $("#mapInfo");
    mapInfo.empty();
    
    function newItem(text) {
      var item = $("<li></li>");
      if(text) item.text(text);
      mapInfo.append(item);
      return item;
    }
    
    newItem(map.name);
    newItem("Funds: " + map.funds);
    newItem("Players: " + map.players);
  }
  
  function populateMapTileStats(mapData) {
    var stats = {};
    for(var i = 0; i < mapData.length; ++i) {
      var tile = mapData[i];
      if(!(tile.type in stats)) {
        stats[tile.type] = 1;
      } else {
        stats[tile.type] += 1;
      }
    }
    
    client.stub.gameRules(null, function(rules) {
      var captureFlagId = null;
      for(flagId in rules.terrainFlags) {
        if(rules.terrainFlags[flagId].name == "Capturable") {
          captureFlagId = parseInt(flagId);
          break;
        }
      }

      if(captureFlagId !== null) {
        var mapTiles = $("#mapTiles");
        mapTiles.empty();
        for(tileType in stats) {
          if(rules.terrains[tileType].flags.indexOf(captureFlagId) != -1) {
            var item = $("<li></li>");
            var image = $("<img></img>");
            image.attr("src", "/img/themes/pixel/" + SPRITE_SHEET_MAP[0][tileType][0][0].img)
            var text = $("<span></span");
            text.text("x" + stats[tileType]);
            item.append(image);
            item.append(text);
            item.addClass("mapTileStat");
            mapTiles.append(item);
          }
        }
      }
      
    });
  }
}();

