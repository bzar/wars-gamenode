require(["jquery-1.6.2.min.js", "/socket.io/socket.io.js", "/gamenode/gameNodeClient.js", "/gamenode/session.js", 
        "skeleton", "settings", "base"], function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, function() {
      populateNavigation(session);
    });
  });
});

