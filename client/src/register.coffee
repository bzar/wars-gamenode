require ["gamenode", "base"], ->
  client = new GameNodeClient()
  session = new Session(client)
  session.onAuthenticationSuccess = ->
    location.replace "mygames.html"

  client.onConnected = ->
    session.authenticate()

  $(document).ready ->
    $("#registerForm").submit (e) ->
      e.preventDefault()
      username = $("#username").val()
      password = $("#password").val()
      password2 = $("#password2").val()
      email = $("#email").val()
      unless password is password2
        alert "Passwords do not match!"
        return
      client.stub.register username, password, email, (params) ->
        if params.success
          session.authenticate username, password
        else
          alert params.reason

    client.connect WARS_CLIENT_SETTINGS.gameServer


