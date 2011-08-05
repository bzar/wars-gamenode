var wrap = function() {
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
    session.onAuthenticationFailure = function() {
      console.log("no existing session");
    }

    session.authenticate();
  }

  $(document).ready(function() {
      $("#loginForm").submit(function(e) {
	  e.preventDefault();
          session.onAuthenticationFailure = function() {
            alert("Invalid username/password!");
          }
	  session.authenticate($("#username").val(), $("#password").val());
      });
      
      client.connect();
  });
}();

