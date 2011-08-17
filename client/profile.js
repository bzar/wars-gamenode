var wrap = function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, undefined, loginUrl, function() {
      populateNavigation(session);
      initialize(client);
    });
  });
  
  function initialize(client) {
    var theme = $("#theme");
    var currentTheme = localStorage.getItem("theme");
    if(currentTheme) {
      theme.val(currentTheme);
    }
    theme.change(function() {
      localStorage.setItem("theme", $(this).val());
    });
  }
}();

