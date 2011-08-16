var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  var theme = localStorage.getItem("theme");
  theme = theme ? theme : "pixel";
  var mapPainter = new Map(undefined, undefined, theme);
  
  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      populateNavigation(session);
      populateMyMaps(client);
    });
  });
  
  function populateMyMaps(client) {
    mapPainter.doPreload(function() {
      client.stub.myMaps(null, function(response) {
        var maps = response.maps;
        var myMaps = $("#myMaps");
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
          
          container.addClass("mapContainer");
          container.attr("href", "mapEditor.html?mapId=" + map.mapId);
          myMaps.append(container);
          
          var hack = function(canvas) {
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
}();

