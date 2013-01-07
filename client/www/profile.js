require(["gamenode", "base"], function() {
  var client = new GameNodeClient(Skeleton);
  var session = null;

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, function() {
      populateNavigation(session);
      initialize(client);
    });
  });
  
  function initialize(client) {
    client.stub.profile(function(response) {
      if(!response.success) {
        alert("Unable to get profile! " + response.reason);
      }
      var profile = response.profile;
      console.log(profile.settings)
      $("#username").val(profile.username);
      $("#email").val(profile.email);
      $("#theme").val(profile.settings.gameTheme);
      $("#animationSpeed").val(profile.settings.animationSpeed);
      $("#emailNotifications").prop("checked", profile.settings.emailNotifications);
    });
    
    $("#profileForm").submit(function(e) {
      e.preventDefault();
      var username = $("#username").val();
      var email = $("#email").val();
      var gameTheme = $("#theme").val();
      var animationSpeed = $("#animationSpeed").val();
      var emailNotifications = $("#emailNotifications").prop("checked");
      
      var password1 = $("#password").val();
      var password2 = $("#password2").val(); 
      var password = password1 != password2 || password1 == "" ? null : password1;
      client.stub.saveProfile(username, password, email, gameTheme, animationSpeed, emailNotifications, function(response){
        if(!response.success) {
          alert("Unable to get profile! " + response.reason);
        } else {
          var message = $("#profileSavedMessage")
          message.show();
          message.fadeOut(2000);
        }
      });
    });
  }
});

