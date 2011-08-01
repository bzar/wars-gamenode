var wrap = function() {
  var client = new GameNodeClient();
  var session = new Session(client);

  session.onAuthenticationSuccess = function() {
    location.replace("home.html");
  }

  client.onConnected = function() {
    console.log("connected to server");
    session.onAuthenticationFailure = function() {
      console.log("no existing session");
      session.onAuthenticationFailure = function() {
	alert("Invalid username/password!");
      }
    }

    session.authenticate();
  }

  $(document).ready(function() {
      $("#loginForm").submit(function(e) {
	  e.preventDefault();
	  session.authenticate($("#username").val(), $("#password").val());
      });
      
      client.connect();
  });
}();

