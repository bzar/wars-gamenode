var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  var mapPainter = new Map(undefined, undefined, "pixel");
  
  $(document).ready(function() {
    session = resumeSessionOrRedirect(client, undefined, "login.html", function() {
      $("#gameSettings").hide();
      populateNavigation(session);
      populateMyMaps(client);
      initializeGameSettings(client);
    });
  });
  
  function populateMyMaps(client) {
    mapPainter.doPreload(function() {
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
            $(this).addClass("selected");
            $("#maps").hide();
            $("#gameSettings").show();
          });
          
          mapList.append(container);
          
          var hack2 = function(canvas) {
            client.stub.mapData(map.mapId, function(response) {
              var mapData = response.mapData;
              mapPainter.canvas = canvas;
              mapPainter.currentTiles = mapData;
              mapPainter.refresh();
            });
          }(previewCanvas[0]);
        }        
      });
    });
  }
  
  function initializeGameSettings(client) {
    $("#turnTimeLimit").change(function() {
      if($(this).prop("checked")) {
        $("#timeLimitInput").show();
      } else {
        $("#timeLimitInput").hide();
      }
    });
    $("#turnTimeLimit").change();
  }
}();

