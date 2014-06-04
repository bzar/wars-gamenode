require ["gamenode", "base"], ->
  client = new GameNodeClient(Skeleton)
  session = null
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      populateNavigation session
      initialize client
    


  initialize = (client) ->
    client.stub.profile (response) ->
      alert "Unable to get profile! " + response.reason  unless response.success
      profile = response.profile
      $("#username").val profile.username
      $("#email").val profile.email
      $("#theme").val profile.settings.gameTheme
      $("#animationSpeed").val profile.settings.animationSpeed
      $("#emailNotifications").prop "checked", profile.settings.emailNotifications
      $("#noHighDpi").prop("checked", profile.settings.noHighDpi);
      return
    $("#profileForm").submit (e) ->
      e.preventDefault()
      username = $("#username").val()
      email = $("#email").val()
      gameTheme = $("#theme").val()
      animationSpeed = $("#animationSpeed").val()
      emailNotifications = $("#emailNotifications").prop("checked")
      noHighDpi = $("#noHighDpi").prop("checked");
      password1 = $("#password").val()
      password2 = $("#password2").val()
      password = (if password1 isnt password2 or password1 is "" then null else password1)
      client.stub.saveProfile username, password, email, gameTheme, animationSpeed, emailNotifications, noHighDpi, (response) ->
        unless response.success
          alert "Unable to get profile! " + response.reason
        else
          message = $("#profileSavedMessage")
          message.show()
          message.fadeOut 2000


