var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  var mapId = /[?&]mapId=(\d+)/.exec(window.location.search);
  if(mapId !== null)
    mapId = parseInt(mapId[1]);
  
  var theme = null;
  var mapPainter = null;

  var mouseDown = false;
  var lastX = null;
  var lastY = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      client.stub.profile(function(response) {
        theme = new Theme(response.profile.settings.gameTheme);
        theme.load(function() {
          mapPainter = new Map(undefined, 1.0, theme);
          populateNavigation(session);
          initializeMapEditor(client);
        });
      });
    });
  });
  
  function updatePalette() {
    var playerSelection = $("#playerSelection");
    var terrainSelection = $("#terrainSelection");
    var unitSelection = $("#unitSelection");
    var terrainPalette = $("#terrainPalette");
    var unitPalette = $("#unitPalette");
    var playerItems = $(".playerSelection");
    playerItems.removeClass("enabled");
    playerItems.removeClass("disabled");
    
    if(terrainSelection.hasClass("selected")) {
      unitPalette.hide();
      terrainPalette.show();
      var terrainType = $("#terrainTypePalette .sprite.selected").attr("type");
      var terrainSubtypePalette = $("#terrainSubtypePalette");
      
      playerItems.each(function(ii, el) {
        var option = $(el);
        var owner = option.attr("value");
        var disabled = $('.sprite[type="' + terrainType + '"][owner="' + owner + '"]', terrainSubtypePalette).length == 0;
        if(disabled)
          option.addClass("disabled");
        else {
          option.addClass("enabled");
        }
      });
      
      if($(".selected.enabled", playerSelection).length == 0) {
        if($(".enabled", playerSelection).length != 0) {
          playerItems.removeClass("selected");
          $($(".playerSelection.enabled")[0]).addClass("selected");
        }
      }
      
      var selectedOwner = $(".playerSelection.selected").attr("value");

      $(".sprite", terrainSubtypePalette).hide();
      $('.sprite[type="' + terrainType + '"][owner="' + selectedOwner + '"]', terrainSubtypePalette).show();
      
      if($(".selected:visible", terrainSubtypePalette).length == 0) {
        $(".sprite", terrainSubtypePalette).removeClass("selected");
        $($(":visible", terrainSubtypePalette)[0]).addClass("selected");
      }
    } else {
      terrainPalette.hide();
      unitPalette.show();
      var unitPalette = $("#unitPalette");
      
      playerItems.each(function(ii, el) {
        var option = $(el);
        var owner = option.attr("value");
        var disabled = $('.sprite[owner="' + owner + '"]', unitPalette).length == 0;
        if(disabled)
          option.addClass("disabled");
        else {
          option.addClass("enabled");
        }
      });
      
      if($(".selected.enabled", playerSelection).length == 0) {
        if($(".enabled", playerSelection).length != 0) {
          playerItems.removeClass("selected");
          $($(".playerSelection.enabled")[0]).addClass("selected");
        }
      }
      
      var selectedOwner = $(".playerSelection.selected").attr("value");
      
      $(".sprite", unitPalette).hide();
      $('.sprite[owner="' + selectedOwner + '"]', unitPalette).show();
      
      $('[type="null"]', unitPalette).show();

      if($(".selected:visible", unitPalette).length == 0) {
        $(".sprite", unitPalette).removeClass("selected");
        $($(":visible", unitPalette)[0]).addClass("selected");
      }
      
    }
  }
  
  function selectedBrush() {
    var terrainSelection = $("#terrainSelection");
    
    if(terrainSelection.hasClass("selected")) {
      var selected = $($("#terrainSubtypePalette .selected")[0]);
      return {type: parseInt(selected.attr("type")), subtype: parseInt(selected.attr("subtype")), 
              owner: parseInt(selected.attr("owner"))}
    } else {
      var selected = $($("#unitPalette .selected")[0]);
      if(selected.attr("type") == "null") {
        return {unit: null};
      }
      return {unit: {type: parseInt(selected.attr("type")), owner: parseInt(selected.attr("owner"))}}
    }
  }
  
  function paintTile(x, y, brush) {
    var tile = mapPainter.getTile(x, y);
    if(brush.type !== undefined) {
      tile.type = brush.type;
    }
    
    if(brush.subtype !== undefined) {
      tile.subtype = brush.subtype;
    }
    
    if(brush.owner !== undefined) {
      tile.owner = brush.owner;
    }
    
    if(brush.unit !== undefined) {
      tile.unit = brush.unit;
    }
  }
  
  function resizeMap(width, height) {
    var mapSize = mapPainter.getMapSize();
    if(width > mapSize.w) {
      for(var x = mapSize.w; x < width; ++x) {
        for(var y = 0; y < mapSize.h; ++y) {
          mapPainter.currentTiles.push({x:x, y:y, type:1, subtype:0, owner:0, unit: null});
        }
      }
    } else if(width < mapSize.w) {
      for(var i = 0; i < mapPainter.currentTiles.length; ++i) {
        var tile = mapPainter.currentTiles[i];
        if(tile.x >= width) {
          mapPainter.currentTiles.splice(i, 1);
          i -= 1;
        }
      }
    }
    if(height > mapSize.h) {
      for(var x = 0; x < width; ++x) {
        for(var y = mapSize.h; y < height; ++y) {
          mapPainter.currentTiles.push({x:x, y:y, type:1, subtype:0, owner:0, unit: null});
        }
      }
    } else if(height < mapSize.h) {
      for(var i = 0; i < mapPainter.currentTiles.length; ++i) {
        var tile = mapPainter.currentTiles[i];
        if(tile.y >= height) {
          mapPainter.currentTiles.splice(i, 1);
          i -= 1;
        }
      }
    }
  }
  
  function shiftMapUp() {
    var mapSize = mapPainter.getMapSize();
    for(var i = 0; i < mapPainter.currentTiles.length; ++i) {
      var tile = mapPainter.currentTiles[i];
      if(tile.y == 0) {
        tile.y = mapSize.h - 1;
      } else {
        tile.y -= 1;
      }
    }
    mapPainter.refresh();
  }
  
  function shiftMapDown() {
    var mapSize = mapPainter.getMapSize();
    for(var i = 0; i < mapPainter.currentTiles.length; ++i) {
      var tile = mapPainter.currentTiles[i];
      if(tile.y == mapSize.h - 1) {
        tile.y = 0;
      } else {
        tile.y += 1;
      }
    }
    mapPainter.refresh();
  }
  
  function shiftMapLeft() {
    var mapSize = mapPainter.getMapSize();
    for(var i = 0; i < mapPainter.currentTiles.length; ++i) {
      var tile = mapPainter.currentTiles[i];
      if(tile.x == 0) {
        tile.x = mapSize.w - 1;
      } else {
        tile.x -= 1;
      }
    }
    mapPainter.refresh();
  }
  
  function shiftMapRight() {
    var mapSize = mapPainter.getMapSize();
    for(var i = 0; i < mapPainter.currentTiles.length; ++i) {
      var tile = mapPainter.currentTiles[i];
      if(tile.x == mapSize.w - 1) {
        tile.x = 0;
      } else {
        tile.x += 1;
      }
    }
    mapPainter.refresh();
  }
  
  function saveMap(name, funds) {
    var mapData = mapPainter.currentTiles;
    if(mapId === null) {
      client.stub.createMap(name, funds, mapData, function(response) {
        if(response.success) {
          mapId = parseInt(response.mapId);
          history.pushState(undefined, undefined, document.location.pathname + "?mapId=" + mapId);
          var message = $("#mapSavedMessage")
          message.show();
          message.fadeOut(2000);
        } else {
          alert("Error saving map!" + response.reason);
        }
      });
    } else {
     client.stub.updateMap(mapId, name, funds, mapData, function(response) {
        if(response.success) {
          var message = $("#mapSavedMessage")
          message.show();
          message.fadeOut(2000);
        } else {
          alert("Error saving map!" + response.reason);
        }
      });
    }
  }
  
  function importMap() {
    var info = JSON.parse($("#importExportData").val());
    if(info) {
      $("#mapName").val(info.name);
      $("#mapFunds").val(info.funds);
      mapPainter.currentTiles = info.data;
      setCanvasSize($("#mapEditorView"));
      mapPainter.refresh();
    } else {
      alert("Invalid map data!");
    }
  }
  
  function exportMap() {
    var info = {name: $("#mapName").val(), funds: $("#mapFunds").val(), data: mapPainter.currentTiles};
    $("#importExportData").val(JSON.stringify(info));
  }
  
  function handleMouseDown(event) {
    mouseDown = true;
    handleMouseMove(event);
    return false;
  }
  
  function handleMouseUp(event) {
    mouseDown = false;
    lastX = null;
    lastY = null;
    return false;
  }
  
  function handleMouseMove(event) {
    if(mouseDown) {
      var x = mapPainter.eventToTileX(event);
      var y = mapPainter.eventToTileY(event);
      if(x != lastX || y != lastY) {
        var brush = selectedBrush();
        paintTile(x, y, brush);
        mapPainter.refresh();
        lastX = x;
        lastY = y;
      }
    }
    return false;
  }
  
  function handleMouseEnter(event) {
    mouseDown = false;
  }
  
  function setCanvasSize(canvas) {
    var mapSize = mapPainter.getMapSize();
    var width = mapSize.w * mapPainter.tileW;
    var height = mapSize.h * mapPainter.tileH - mapPainter.unitOffsetY;
    console.log(height);
    canvas.attr("width", width);
    canvas.attr("height", height);
  }
  
  function initializeMap(canvas, mapData) {
    mapPainter.canvas = canvas[0];
    mapPainter.currentTiles = mapData;
    mapPainter.showGrid = true;
    setCanvasSize(canvas);
    var mapSize = mapPainter.getMapSize();
    $("#mapWidth").val(mapSize.w);
    $("#mapHeight").val(mapSize.h);
    mapPainter.refresh();
    canvas.mousedown(handleMouseDown);
    canvas.mouseup(handleMouseUp);
    canvas.mousemove(handleMouseMove);
    canvas.mouseenter(handleMouseEnter);
  }
  
  function initializeMapEditor(client) {
    var canvas = $("#mapEditorView");
    mapPainter.doPreload(function() {
      if(mapId !== null) {
        client.stub.mapData(mapId, function(response) {
          var mapData = response.mapData;
          $("#mapName").val(response.name);
          $("#mapFunds").val(response.funds);
          initializeMap(canvas, mapData);
        });
      } else {
        var mapData = [];
        for(var y = 0; y < 15; ++y) {
          for(var x = 0; x < 15; ++x) {
            mapData.push({x:x, y:y, type:1, subtype:0, owner:0, unit: null});
          }
        }
        initializeMap(canvas, mapData);
      }
    });
    
    // MAIN MENU / EDITOR TOOLS
    $("#showMapEditorTools").click(function(e) {
      e.preventDefault();
      $("#mapEditorTools").show();
      $("#mainMenu").hide();
    });
    
    $("#showMainMenu").click(function(e) {
      e.preventDefault();
      $("#mapEditorTools").hide();
      $("#mainMenu").show();
    });
    
    $("#showMapEditorTools").click();
    
    // TOOL SELECTION
    
    var toolSelection = $("#toolSelection");
    var palette = $("#palette");
    var mapSize = $("#mapSize");
    var mapProperties = $("#mapProperties");
    
    $("a", toolSelection).click(function(e) {
      e.preventDefault();
      palette.hide();
      mapSize.hide();
      mapProperties.hide();
      $($(this).attr("value")).show();
    });
    
    $("#showPalette").click();
    
    // PALETTE
    
    var terrainPalette = $("#terrainPalette");
    var unitPalette = $("#unitPalette");
    var terrainSelection = $("#terrainSelection");
    var unitSelection = $("#unitSelection");
    var playerSelection = $("#playerSelection");
    
    $(".playerSelection").each(function() {
      $(this).css("background-color", theme.getPlayerColorString(parseInt($(this).attr("value"))));
    });
    
    $(".playerSelection").click(function(e) {
      e.preventDefault();
      if($(this).hasClass("disabled"))
        return;
      $(".playerSelection").removeClass("selected");
      $(this).addClass("selected");
      updatePalette();
    });
    
    $(".playerSelection:first-child").click();
    
    terrainSelection.click(function() {
      unitSelection.removeClass("selected");
      terrainSelection.addClass("selected");
      updatePalette();
    });
    
    unitSelection.click(function() {
      terrainSelection.removeClass("selected");
      unitSelection.addClass("selected");
      updatePalette();
    });
    
    terrainSelection.click();
    
    var terrainTypePalette = $("#terrainTypePalette");
    var terrainSubtypePalette = $("#terrainSubtypePalette");
    
    for(var terrainType = 0; terrainType < theme.getNumberOfTileTypes(); ++terrainType) {
      var terrainTypeItem = $("<span></span>");
      terrainTypeItem.css("background-image", "url('" + theme.getSpriteSheetUrl() + "')");
      terrainTypeItem.addClass("sprite");
      var pos = theme.getTileCoordinates(terrainType, 0, 0);
      var imageX = pos.x * mapPainter.tileW;
      var imageY = pos.y * mapPainter.tileH;
      terrainTypeItem.css("background-position", -imageX + "px " + -imageY + "px")
      terrainTypeItem.attr("type", terrainType);
      terrainTypePalette.append(terrainTypeItem);
            
      for(var terrainSubtype = 0; terrainSubtype < theme.getNumberOfTileSubtypes(terrainType); ++terrainSubtype) {
        for(var terrainOwner = 0; terrainOwner < theme.getNumberOfTileOwners(terrainType, terrainSubtype); ++terrainOwner) {
          var terrainSubtypeItem = $("<span></span>");
          terrainSubtypeItem.css("background-image", "url('" + theme.getSpriteSheetUrl() + "')");
          terrainSubtypeItem.addClass("sprite");
          var pos = theme.getTileCoordinates(terrainType, terrainSubtype, terrainOwner);
          var imageX = pos.x * mapPainter.tileW;
          var imageY = pos.y * mapPainter.tileH;
          terrainSubtypeItem.css("background-position", -imageX + "px " + -imageY + "px")
          terrainSubtypeItem.attr("type", terrainType);
          terrainSubtypeItem.attr("subtype", terrainSubtype);
          terrainSubtypeItem.attr("owner", terrainOwner);
          terrainSubtypePalette.append(terrainSubtypeItem);
        }
      }
    }
    
    $("#terrainTypePalette .sprite").click(function() {
      $("#terrainTypePalette .sprite.selected").removeClass("selected");
      $(this).addClass("selected");
      updatePalette();
    });

    $("#terrainSubtypePalette .sprite").click(function() {
      $("#terrainSubtypePalette .sprite.selected").removeClass("selected");
      $(this).addClass("selected");
      updatePalette();
    });
    
    var unitEraserItem = $("<span></span>");
    unitEraserItem.attr("type", "null");
    unitEraserItem.attr("owner", "null");
    unitEraserItem.css("background-image", "url(" + theme.getEraserIconUrl() + ")");
    unitEraserItem.addClass('sprite');
    unitPalette.append(unitEraserItem);
    
    for(var unitType = 0; unitType < theme.getNumberOfUnitTypes(); ++unitType) {
      for(var unitOwner = 0; unitOwner < theme.getNumberOfUnitOwners(unitType); ++unitOwner) {
        var unitItem = $("<span></span>");
        var pos = theme.getUnitCoordinates(unitType, unitOwner);
        if(pos === null)
          continue;
        unitItem.attr("type", unitType);
        unitItem.attr("owner", unitOwner);
        unitItem.css("background-image", "url('" + theme.getSpriteSheetUrl() + "')");
        unitItem.addClass('sprite');
        var imageX = pos.x * mapPainter.tileW;
        var imageY = pos.y * mapPainter.tileH;
        unitItem.css("background-position", -imageX + "px " + -imageY + "px")
        unitPalette.append(unitItem);
      }
    }
    
    $("#unitPalette .sprite").click(function() {
      $("#unitPalette .sprite.selected").removeClass("selected");
      $(this).addClass("selected");
      updatePalette();
    });
    
    $(":first-child", terrainTypePalette).addClass("selected");
    $(":first-child", terrainSubtypePalette).addClass("selected");
    $(":first-child", unitPalette).addClass("selected");
    
    updatePalette();
    
    // MAP SIZE
    
    mapSize.submit(function(e) {
      e.preventDefault();
      resizeMap(parseInt($("#mapWidth").val()), parseInt($("#mapHeight").val()));
      setCanvasSize(canvas);
      mapPainter.refresh();
    });
    
    $("#shiftMapUp").click(shiftMapUp);
    $("#shiftMapDown").click(shiftMapDown);
    $("#shiftMapLeft").click(shiftMapLeft);
    $("#shiftMapRight").click(shiftMapRight);
    
    // MAP PROPERTIES
    
    $("#mapSaveForm").submit(function(e) {
      e.preventDefault();
      saveMap($("#mapName").val(), parseInt($("#mapFunds").val()));
    });
    
    $("#import").click(importMap);
    $("#export").click(exportMap);
    $("#mapImportExportForm").submit(function(e) {
      e.preventDefault();
    });
  }
}();

