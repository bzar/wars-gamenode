// Generated by CoffeeScript 1.4.0
(function() {
  var Paginator, addChatMessage, e, forEachProperty, getObjectWithId, initializeChat, populateNavigation, timeString, zeroPad;

  populateNavigation = function(session) {
    return $("#logout").click(function(e) {
      e.preventDefault();
      return session.close();
    });
  };

  zeroPad = function(str, len) {
    var s;
    s = str.toString();
    while (s.length < len) {
      s = "0" + s;
    }
    return s;
  };

  timeString = function(t) {
    return t.getFullYear() + "-" + zeroPad(t.getMonth() + 1, 2) + "-" + zeroPad(t.getDate(), 2) + " " + zeroPad(t.getHours(), 2) + ":" + zeroPad(t.getMinutes(), 2);
  };

  addChatMessage = function(time, sender, content) {
    var messageContent, messageItem, messageSender, messageTime, messages, t;
    messages = $("#chatMessages");
    messageItem = $("<li></li>");
    messageTime = $("<span></span>");
    messageSender = $("<span></span>");
    messageContent = $("<span></span>");
    t = new Date(Date.parse(time));
    messageTime.text(timeString(t));
    messageTime.addClass("messageTime");
    messageSender.text(sender);
    messageSender.addClass("messageSender");
    messageContent.text(content);
    messageContent.addClass("messageContent");
    messageItem.append(messageTime);
    messageItem.append(messageSender);
    messageItem.append(messageContent);
    messages.append(messageItem);
    return messages.scrollTop(messages[0].scrollHeight);
  };

  initializeChat = function(client, gameId) {
    if (!(gameId != null)) {
      client.stub.subscribeLobbyChat();
    } else {
      client.stub.chatMessages(gameId, function(response) {
        var message, _i, _len, _ref, _results;
        if (!response.success) {
          alert("Could not get chat messages! " + response.reason);
          return;
        }
        _ref = response.chatMessages;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          message = _ref[_i];
          _results.push(addChatMessage(message.time, message.sender, message.content));
        }
        return _results;
      });
    }
    client.skeleton.chatMessage = function(time, sender, content) {
      addChatMessage(time, sender, content);
      if ($("#chat").css("display") === "none") {
        return $("#showChat").addClass("highlight");
      }
    };
    $("#showHideChat").click(function(e) {
      var chat, messages;
      e.preventDefault();
      chat = $("#chat");
      if (chat.hasClass("small")) {
        return chat.removeClass("small");
      } else {
        chat.addClass("small");
        messages = $("#chatMessages");
        return messages.scrollTop(messages[0].scrollHeight);
      }
    });
    return $("#chatForm").submit(function(e) {
      var message;
      e.preventDefault();
      message = $("#chatInput").val();
      $("#chatInput").val("");
      if (message.length > 0) {
        if (gameId != null) {
          return client.stub.chat(gameId, message);
        } else {
          return client.stub.lobbyChat(message);
        }
      }
    });
  };

  forEachProperty = function(object, callback) {
    var key, _results;
    _results = [];
    for (key in object) {
      if (object.hasOwnProperty(key)) {
        _results.push(callback(object[key], key, object));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  getObjectWithId = function(from, id) {
    var object;
    object = null;
    forEachProperty(from, function(value) {
      return object = (value.id === id ? value : object);
    });
    return object;
  };

  Paginator = (function() {

    function Paginator(data, clearItemsFunc, addItemFunc) {
      this.data = data;
      this.clearItemsFunc = clearItemsFunc;
      this.addItemFunc = addItemFunc;
      this.pageSize = 10;
      this.currentPage = 0;
    }

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

    Paginator.prototype.pages = function() {
      if (this.data.length > 0) {
        return Math.ceil(this.data.length / this.pageSize);
      } else {
        return 1;
      }
    };

    Paginator.prototype.setPage = function(pageNum) {
      var firstElem, i, lastElem;
      if (pageNum <= this.lastPage() && pageNum >= this.firstPage()) {
        this.currentPage = pageNum;
        firstElem = Math.max(0, Math.min((pageNum - 1) * this.pageSize, this.data.length - 1));
        lastElem = Math.max(0, Math.min(pageNum * this.pageSize, this.data.length));
        this.clearItemsFunc();
        i = firstElem;
        while (i < lastElem) {
          this.addItemFunc(this.data[i]);
          ++i;
        }
      }
      return this;
    };

    return Paginator;

  })();

  e = typeof exports !== "undefined" && exports !== null ? exports : this;

  e.populateNavigation = populateNavigation;

  e.zeroPad = zeroPad;

  e.addChatMessage = addChatMessage;

  e.initializeChat = initializeChat;

  e.Paginator = Paginator;

  e.forEachProperty = forEachProperty;

  e.getObjectWithId = getObjectWithId;

}).call(this);
