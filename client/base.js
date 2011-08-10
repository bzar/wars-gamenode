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

function zeroPad(str, len) {
  var s = str.toString();
  while(s.length < len) {
    s = "0" + str;
  }
  return s;
}

function initializeChat(client, gameId) {
  if(gameId === undefined) {
    client.stub.subscribeLobbyChat();
  }
  
  client.skeleton.chatMessage = function(messageInfo) {
    var messages = $("#chatMessages");
    var messageItem = $("<li></li>");
    var messageTime = $("<span></span>");
    var messageSender = $("<span></span>");
    var messageContent = $("<span></span>");
    
    var time = new Date(Date.parse(messageInfo.time));
    messageTime.text(zeroPad(time.getHours(), 2) + ":" + zeroPad(time.getMinutes(), 2));
    messageTime.addClass("messageTime");
    
    messageSender.text(messageInfo.sender);
    messageSender.addClass("messageSender");
    
    messageContent.text(messageInfo.content);
    messageContent.addClass("messageContent");
    
    messageItem.append(messageTime);
    messageItem.append(messageSender);
    messageItem.append(messageContent);
    
    messages.append(messageItem);
    messages.scrollTop(messages[0].scrollHeight);
    
    var chat = $("#chat");
    if(chat.css("display") == "none") {
      $("#showChat").addClass("highlight");
    }
    
  }
  
  $("#showHideChat").click(function(e) {
    e.preventDefault();
    
    var chat = $("#chat");
    if(chat.hasClass("small")) {
      chat.removeClass("small");
    } else {
      chat.addClass("small");
      $("#chatMessages").scrollTop(messages[0].scrollHeight);
    }
  });
  
  $("#chatForm").submit(function(e) {
    e.preventDefault();
    var message = $("#chatInput").val();
    $("#chatInput").val("");
    if(message.length > 0) {
      if(gameId === undefined) {
        client.stub.lobbyChat(message);
      } else {
        client.stub.chat({gameId: gameId, message: message});
      }
    }
  });
}