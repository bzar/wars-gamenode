require(["gamenode"], function() {
  $("#username").prop("disabled", true);
  $("#password").prop("disabled", true);
  $("#remember").prop("disabled", true);
  $("#loginButton").prop("disabled", true);

  var client = new GameNodeClient();
  var session = new Session(client);

  var next = /[?&]next=(.*)/.exec(window.location.search);
  if(next !== null)
    next = next[1];
  else
    next = "mygames.html";

  session.onAuthenticationSuccess = function() {
    location.replace(next);
  }

  client.onConnected = function() {
    $("#username").prop("disabled", false);
    $("#username").focus();
    $("#password").prop("disabled", false);
    $("#remember").prop("disabled", false);
    $("#loginButton").prop("disabled", false);
    session.authenticate();
  }

  $(document).ready(function() {
    $("#loginForm").submit(function(e) {
      e.preventDefault();
      session.onAuthenticationFailure = function() {
        alert("Invalid username/password!");
      }

      var username = $("#username").val();
      var password = $("#password").val();
      var remember = $("#remember").prop("checked");
      session.authenticate(username, password, remember);
    });

    client.connect(WARS_CLIENT_SETTINGS.gameServer);

  });
});

