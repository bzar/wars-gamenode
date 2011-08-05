function populateNavigation(session) {
  var navigationItems = [
    {title: "Home", href: "home.html"},
    {title: "My maps", href: "myMaps.html"},
    {title: "Create a game", href: "createGame.html"},
    {title: "Join a game", href: "join.html"},
    {title: "Spectate", href: "spectate.html"},
    {title: "Logout", href: "#", id: "logout"},
  ]
  
  var navigation = $("#navigation");
  for(var i = 0; i < navigationItems.length; ++i) {
    var item = $("<li></li>");
    var link = $("<a></a>");
    
    link.attr("href", navigationItems[i].href);
    link.text(navigationItems[i].title);
    if(navigationItems[i].id)
      link.attr("id", navigationItems[i].id);
    item.append(link);
    navigation.append(item);
  }
  
  $("#logout").click(function(e) {
    e.preventDefault();
    session.close();
  });
}