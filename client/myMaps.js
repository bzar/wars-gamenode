var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  var theme = null;
  var mapPainter = null;
  var paginator = null;

  var initialPage = /(\d+)/.exec(window.location.hash);
  if(initialPage !== null) {
    initialPage = parseInt(initialPage[1]);
  } else {
    initialPage = 1;
    window.location.hash = initialPage;
  }
  
  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      client.stub.profile(function(response) {
        theme = new Theme(response.profile.settings.gameTheme);
        theme.load(function() {
          mapPainter = new Map(undefined, undefined, theme);
          populateNavigation(session);
          populateMyMaps(client);
        });
      });
    });
  });
  
  function updatePageControls() {
    $("#firstPage").attr("href", "#" + paginator.firstPage()).toggle(paginator.currentPage != paginator.firstPage());
    $("#lastPage").attr("href", "#" + paginator.lastPage()).toggle(paginator.currentPage != paginator.lastPage());
    $("#prevPage").attr("href", "#" + paginator.prevPage()).toggle(paginator.currentPage != paginator.firstPage());
    $("#nextPage").attr("href", "#" + paginator.nextPage()).toggle(paginator.currentPage != paginator.lastPage());
    $(".pageLink").removeClass("current");
    $(".pageLink[page=\"" + paginator.currentPage + "\"]").addClass("current");
  }
  
  function populateMyMaps(client) {
    mapPainter.doPreload(function() {
      client.stub.myMaps(null, function(response) {
        var maps = response.maps;
        var myMaps = $("#myMaps");
        paginator = new Paginator(maps, function(){ myMaps.empty() }, function(map) {
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
          
          client.stub.mapData(map.mapId, function(response) {
            var mapData = response.mapData;
            mapPainter.canvas = previewCanvas[0];
            mapPainter.currentTiles = mapData;
            mapPainter.refresh();
          });
        });
        paginator.setPage(initialPage);
        
        var pages = $("#pages");
        for(var i = 0; i < paginator.pages(); ++i) {
          var pageLink = $("<a></a>");
          pageLink.text(i + 1);
          pageLink.attr("href", "#" + (i + 1));
          pageLink.attr("page", i + 1);
          pageLink.addClass("pageLink");
          pages.append(pageLink);
        }
        
        function changePage(e, page) {
          e.preventDefault();
          paginator.setPage(page);
          window.location.hash = page;
          updatePageControls();
        }
        
        updatePageControls();
        
        $(".pageLink").click(function(e) { changePage(e, parseInt($(this).attr("page"))); });
        $("#firstPage").click(function(e) { changePage(e, paginator.firstPage()); });
        $("#lastPage").click(function(e) { changePage(e, paginator.lastPage()); });
        $("#nextPage").click(function(e) { changePage(e, paginator.nextPage()); });
        $("#prevPage").click(function(e) { changePage(e, paginator.prevPage()); });
      
        if(paginator.pages() == 1) {
          $("#pageControls").hide();
        }
      });
    });
  }
}();

