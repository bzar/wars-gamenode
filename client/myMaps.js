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
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, function() {
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
  
  function changePage(e, page) {
    if(e !== undefined)
      e.preventDefault();
    paginator.setPage(page);
    window.location.hash = page;
    updatePageControls();
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
        
        $(".pageLink").click(function(e) { changePage(e, parseInt($(this).attr("page"))); });
        $("#firstPage").click(function(e) { changePage(e, paginator.firstPage()); });
        $("#lastPage").click(function(e) { changePage(e, paginator.lastPage()); });
        $("#nextPage").click(function(e) { changePage(e, paginator.nextPage()); });
        $("#prevPage").click(function(e) { changePage(e, paginator.prevPage()); });
      
        changePage(undefined, initialPage);
        populateMapFilter(maps);
      });
    });
  }
  
  function filterMaps(maps) {
    var minPlayers = parseInt($("#minPlayers").val());
    var maxPlayers = parseInt($("#maxPlayers").val());
    var namePart = $("#mapName").val().toLowerCase();
    
    paginator.data = maps.filter(function(map) {
      return map.players >= minPlayers && 
             map.players <= maxPlayers && 
             (namePart == "" || map.name.toLowerCase().indexOf(namePart) != -1);
    });
    paginator.setPage(paginator.firstPage());
    updatePageControls();
  }
  
  function populateMapFilter(maps) {
    var minPlayers = null;
    var maxPlayers = null;
    maps.forEach(function(map) {
      minPlayers = minPlayers && minPlayers < map.players ? minPlayers : map.players;
      maxPlayers = maxPlayers && maxPlayers > map.players ? maxPlayers : map.players;
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
}();

