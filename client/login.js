require(["jquery-1.6.2.min.js", "/socket.io/socket.io.js", "/gamenode/gameNodeClient.js", "/gamenode/session.js", 
        "skeleton", "settings"], function() {
  var client = new GameNodeClient();
  var session = new Session(client);
  
  var next = /[?&]next=(.*)/.exec(window.location.search);
  if(next !== null)
    next = next[1];
  else
    next = "home.html";
  
  session.onAuthenticationSuccess = function() {
    location.replace(next);
  }

  client.onConnected = function() {
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

