require(["jquery-1.6.2.min.js", "gamenode", "base", "image_map", "theme", "map"], function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  var paginator = null;
  var initialPage = /(\d+)/.exec(window.location.hash);
  if(initialPage !== null) {
    initialPage = parseInt(initialPage[1]);
  } else {
    initialPage = 1;
    window.location.hash = initialPage;
  }
  
  var lastMapId = null;
  var mapId = /[?&]mapId=([0-9a-f]+)/.exec(window.location.search);
  if(mapId !== null)
    mapId = mapId[1];
  
  var theme = null;
  var mapPainter = null;
  
  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, function() {
      client.stub.profile(function(response) {
        theme = new Theme(response.profile.settings.gameTheme);
        theme.load(function() {
          mapPainter = new Map(undefined, undefined, theme);
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
    $("#selectMapControls").show();
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
        var width = mapSize.w * mapPainter.tileW;
        var height = mapSize.h * mapPainter.tileH + mapPainter.unitOffsetY;
        canvas.attr("width", width);
        canvas.attr("height", height);
        mapPainter.scale = 1.0;
        mapPainter.autoscale = false;
        mapPainter.refresh();
      });
    }
    $("#mapSelection").hide();
    $("#mapFullPreview").show();
    $("#gameSettings").hide();
    $("#navigation").hide();
    $("#selectMapControls").hide();
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
    $("#selectMapControls").hide();
    $("#mapPreviewControls").hide();
    $("#createGameControls").show();
  }
  
  function changePage(e, page) {
    if(e !== undefined)
      e.preventDefault();
    paginator.setPage(page);
    window.location.hash = page;
    updatePageControls();
  }
      
  function updatePageControls() {
    var pages = $("#pages");
    pages.empty();
    for(var i = 0; i < paginator.pages(); ++i) {
      var pageLink = $("<a></a>");
      pageLink.text(i + 1);
      pageLink.attr("href", "#" + (i + 1));
      pageLink.attr("page", i + 1);
      pageLink.addClass("pageLink");
      pages.append(pageLink);
    }
      
    $("#firstPage").attr("href", "#" + paginator.firstPage()).toggle(paginator.currentPage != paginator.firstPage());
    $("#lastPage").attr("href", "#" + paginator.lastPage()).toggle(paginator.currentPage != paginator.lastPage());
    $("#prevPage").attr("href", "#" + paginator.prevPage()).toggle(paginator.currentPage != paginator.firstPage());
    $("#nextPage").attr("href", "#" + paginator.nextPage()).toggle(paginator.currentPage != paginator.lastPage());
    
    $(".pageLink").removeClass("current");
    $(".pageLink[page=\"" + paginator.currentPage + "\"]").addClass("current");
    $(".pageLink").click(function(e) { changePage(e, parseInt($(this).attr("page"))); });
    
    $("#pageControls").toggle(paginator.pages() > 1);
  }

  function populateMaps(client) {
    client.stub.maps(null, function(response) {
      var maps = response.maps;
      var mapList = $("#maps");
      
      paginator = new Paginator(maps, function(){ mapList.empty() }, function(map) {
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
        
        client.stub.mapData(map.mapId, function(response) {
          var mapData = response.mapData;
          mapPainter.canvas = previewCanvas[0];
          mapPainter.currentTiles = mapData;
          mapPainter.autoscale = true;
          mapPainter.refresh();
        });
      });
      
      $("#firstPage").click(function(e) { changePage(e, paginator.firstPage()); });
      $("#lastPage").click(function(e) { changePage(e, paginator.lastPage()); });
      $("#nextPage").click(function(e) { changePage(e, paginator.nextPage()); });
      $("#prevPage").click(function(e) { changePage(e, paginator.prevPage()); });

      changePage(undefined, initialPage);
      populateMapFilter(maps);
    });        
  }
  
  function filterMaps(maps) {
    var minPlayers = parseInt($("#minPlayers").val());
    var maxPlayers = parseInt($("#maxPlayers").val());
    var authorId = $("#mapAuthor").val();
    var namePart = $("#mapName").val().toLowerCase();
    
    paginator.data = maps.filter(function(map) {
      return map.players >= minPlayers && 
             map.players <= maxPlayers && 
             (authorId == "" || map.authorId == authorId) &&
             (namePart == "" || map.name.toLowerCase().indexOf(namePart) != -1);
    });
    paginator.setPage(paginator.firstPage());
    updatePageControls();
  }
  
  function populateMapFilter(maps) {
    var minPlayers = null;
    var maxPlayers = null;
    var authors = [{name: "Anyone", authorId: ""}];
    maps.forEach(function(map) {
      minPlayers = minPlayers && minPlayers < map.players ? minPlayers : map.players;
      maxPlayers = maxPlayers && maxPlayers > map.players ? maxPlayers : map.players;
      if(!authors.some(function(author){ return author.authorId == new String(map.authorId); })) {
        authors.push({name: map.authorName, authorId: map.authorId});
      }
    });
    
    var minPlayersSelect = $("#minPlayers");
    var maxPlayersSelect = $("#maxPlayers");
    
    for(var i = minPlayers; i <= maxPlayers; ++i) {
      var minOption = $("<option></option>");
      minOption.attr("value", i);
      minOption.text(i);
      minOption.prop("selected", i == minPlayers);
      minPlayersSelect.append(minOption);
      
      var maxOption = $("<option></option>");
      maxOption.attr("value", i);
      maxOption.text(i);
      maxOption.prop("selected", i == maxPlayers);
      maxPlayersSelect.append(maxOption);
    }
    
    var mapAuthorSelect = $("#mapAuthor");
    authors.forEach(function(author) {
      var option = $("<option></option>");
      option.attr("value", author.authorId);
      option.text(author.name);
      mapAuthorSelect.append(option);
    });
    
    minPlayersSelect.change(function() {
      if(parseInt(maxPlayersSelect.val()) < parseInt($(this).val())) {
        maxPlayersSelect.val($(this).val());
      }
    });
    
    maxPlayersSelect.change(function() {
      if(parseInt(minPlayersSelect.val()) > parseInt($(this).val())) {
        minPlayersSelect.val($(this).val());
      }
    });
    
    $("#mapFilterForm").submit(function(e) {
      e.preventDefault();
      filterMaps(maps);
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
            var image = $("<span></span>");
            image.css("background-image", "url('" + theme.getSpriteSheetUrl() + "')");
            image.addClass("sprite");
            var pos = theme.getTileCoordinates(tileType, 0, 0);
            var imageX = pos.x * mapPainter.tileW;
            var imageY = pos.y * mapPainter.tileH;
            image.css("background-position", -imageX + "px " + -imageY + "px")
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
});

