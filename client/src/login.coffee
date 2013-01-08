require ["gamenode"], ->
  $("#username").prop "disabled", true
  $("#password").prop "disabled", true
  $("#remember").prop "disabled", true
  $("#loginButton").prop "disabled", true
  client = new GameNodeClient()
  session = new Session(client)
  next = /[?&]next=(.*)/.exec(window.location.search)
  if next isnt null
    next = next[1]
  else
    next = "mygames.html"
  session.onAuthenticationSuccess = ->
    location.replace next

  client.onConnected = ->
    $("#username").prop "disabled", false
    $("#username").focus()
    $("#password").prop "disabled", false
    $("#remember").prop "disabled", false
    $("#loginButton").prop "disabled", false
    session.authenticate()

  $(document).ready ->
    $("#loginForm").submit (e) ->
      e.preventDefault()
      session.onAuthenticationFailure = ->
        alert "Invalid username/password!"

      username = $("#username").val()
      password = $("#password").val()
      remember = $("#remember").prop("checked")
      session.authenticate username, password, remember

    client.connect WARS_CLIENT_SETTINGS.gameServer


