require(["gamenode", "base"], function() {
  var client = new GameNodeClient();
  var session = new Session(client);
  
  session.onAuthenticationSuccess = function() {
    location.replace("home.html");
  }
  
  client.onConnected = function() {
    session.authenticate();
  }
    
  $(document).ready(function() {
    $("#registerForm").submit(function(e) {
      e.preventDefault();
      var username = $("#username").val();
      var password = $("#password").val();
      var password2 = $("#password2").val();
      var email = $("#email").val();
      
      if(password != password2) {
        alert("Passwords do not match!");
        return;
      }
      
      client.stub.register(username, password, email, function(params) {
        if(params.success) {
          session.authenticate(username, password);
        } else {
          alert(params.reason);
        }
      });
    });
    
    client.connect(WARS_CLIENT_SETTINGS.gameServer);
  });
});

