require ["gamenode", "base"], ->
  client = new GameNodeClient(Skeleton)
  session = null
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      populateNavigation session
    


