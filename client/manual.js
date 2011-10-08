var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      populateNavigation(session);
    });
  });
}();

