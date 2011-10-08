function populateNavigation(session) {
  var navigationItems = [
    {title: "Home", href: "home.html"},
    {title: "My maps", href: "myMaps.html"},
    {title: "Create a game", href: "createGame.html"},
    {title: "Join a game", href: "join.html"},
    {title: "Spectate", href: "spectate.html"},
    {title: "My profile", href: "profile.html"},
    {title: "Manual", href: "manual.html"},
    {title: "Info", href: "info.html"},
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

function addChatMessage(time, sender, content) {
  var messages = $("#chatMessages");
  var messageItem = $("<li></li>");
  var messageTime = $("<span></span>");
  var messageSender = $("<span></span>");
  var messageContent = $("<span></span>");
  
  var t = new Date(Date.parse(time));
  messageTime.text(zeroPad(t.getHours(), 2) + ":" + zeroPad(t.getMinutes(), 2));
  messageTime.addClass("messageTime");
  
  messageSender.text(sender);
  messageSender.addClass("messageSender");
  
  messageContent.text(content);
  messageContent.addClass("messageContent");
  
  messageItem.append(messageTime);
  messageItem.append(messageSender);
  messageItem.append(messageContent);
  
  messages.append(messageItem);
  messages.scrollTop(messages[0].scrollHeight);
}

function initializeChat(client, gameId) {
  if(gameId === undefined) {
    client.stub.subscribeLobbyChat();
  } else {
    client.stub.chatMessages(gameId, function(response) {
      if(!response.success) {
        alert("Could not get chat messages! " + response.reason);
        return;
      }
      
      for(var i = 0; i < response.chatMessages.length; ++i) {
        var message = response.chatMessages[i];
        addChatMessage(message.time, message.sender, message.content);
      }
    });
  }
  
  client.skeleton.chatMessage = function(time, sender, content) {
    addChatMessage(time, sender, content);
    if($("#chat").css("display") == "none") {
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
      var messages = $("#chatMessages")
      messages.scrollTop(messages[0].scrollHeight);
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
        client.stub.chat(gameId, message);
      }
    }
  });
}

function Paginator(data, clearItemsFunc, addItemFunc) {
  this.data = data;
  this.pageSize = 10;
  this.addItemFunc = addItemFunc;
  this.clearItemsFunc = clearItemsFunc;
  this.currentPage = 0;
}

Paginator.prototype.pages = function() {
  if(this.data.length > 0)
    return Math.ceil(this.data.length / this.pageSize);
  else
    return 1;
};

Paginator.prototype.setPage = function(pageNum) {
  if(pageNum <= this.lastPage() && pageNum >= this.firstPage()) {
    this.currentPage = pageNum;
    var firstElem = Math.max(0, Math.min((pageNum - 1) * this.pageSize, this.data.length - 1));
    var lastElem = Math.max(0, Math.min(pageNum * this.pageSize, this.data.length));
    this.clearItemsFunc();
    for(var i = firstElem; i < lastElem; ++i) {
      this.addItemFunc(this.data[i]);
    }
  }
  
  return this;
};

Paginator.prototype.nextPage = function() {
  return Math.min(this.currentPage + 1, this.lastPage());
};

Paginator.prototype.prevPage = function() {
  return Math.max(this.currentPage - 1, this.firstPage());
};

Paginator.prototype.firstPage = function() {
  return 1;
};

Paginator.prototype.lastPage = function() {
  return this.pages();
};

function forEachProperty(object, callback) {
  for(var key in object) {
    if(object.hasOwnProperty(key))
      callback(object[key], key, object);
  }
}

function getObjectWithId(from, id) {
  var object = null;
  forEachProperty(from, function(value) {
    object = value.id == id ? value : object;
  });
  return object;
}
