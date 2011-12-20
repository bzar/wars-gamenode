function MessageTicker(box, map) {
  this.box = box;
  this.map = map;
  this.showAll = false;
  this.numMessages = 10;
}

MessageTicker.prototype.showToggle = function() {
  this.showAll = !this.showAll;
  if(this.showAll) {
    if(this.onlyShort) {
      this.onlyShort = false;
      this.getEventLog();
    }
    $(".tickerMessage", this.box).show();
  } else {
    $(".tickerMessage:gt(" + (this.numMessages-1) + ")", this.box).hide();
  }
}

MessageTicker.prototype.setMessages = function(msgArray) {
  this.box.empty();
  if(msgArray && msgArray.length > 0) {
    for(var i = 0; i < msgArray.length; ++i) {
      var msg = this.parseMessage(msgArray[i]);
      this.box.append(msg);
    }
    $(".tickerMessage:gt(" + (this.numMessages-1) + ")", this.box).hide();
  }
}

MessageTicker.prototype.showOldMessages = function(msgArray) {
  if(msgArray && msgArray.length > 0) {
    for(var i = 0; i < msgArray.length; ++i) {
      var msg = this.parseMessage(msgArray[i]);
      this.box.append(msg);
    }
  }
}

MessageTicker.prototype.showMessages = function(msgArray) {
  if(msgArray && msgArray.length > 0) {
    for(var i = 0; i < msgArray.length; ++i) {
      var msg = this.parseMessage(msgArray[i]);
      this.box.prepend(msg);
      msg.hide();
      var wrap = function(i, msg, ticker) {
        setTimeout(function() {          
          msg.show();
          if(!this.showAll) {
            $(".tickerMessage:last", ticker.box).hide();
          }
        }, i * 500);
      }(i, msg, this)
    }
  }
}

MessageTicker.prototype.parseMessage = function(message) {
  var msg = null;
  var player = null;
  var time = new Date(Date.parse(message.time));
  var data = message.content;
  
  if(data.action == "attack") {
    msg = [{type:"unit", unit:data.attacker},
           {type:"text", text:"attacks"},
           {type:"unit", unit:data.target},
           {type:"text", text:"inflicting " + data.damage + "% damage"}];
    player = data.attacker.owner;
    
  } else if(data.action == "counterattack") {
    if(data.damage) {
      msg = [{type:"unit", unit:data.attacker},
             {type:"text", text:"counterattacks"},
             {type:"unit", unit:data.target},
             {type:"text", text:"inflicting " + data.damage + "% damage"}];
    } else {
      msg = [{type:"unit", unit:data.attacker},
             {type:"text", text:"cannot counterattack"},
             {type:"unit", unit:data.target}];
    
    }
    player = data.attacker.owner;
    
  } else if(data.action == "capture") {
    msg = [{type:"unit", unit:data.unit},
           {type:"text", text:"captures"},
           {type:"tile", tile:data.tile},
           {type:"text", text:"(" + data.left + " capture points left)"}];
    player = data.unit.owner;
  } else if(data.action == "captured") {
    msg = [{type:"unit", unit:data.unit},
           {type:"text", text:"captured"},
           {type:"tile", tile:data.tile}];
    player = data.unit.owner;
  } else if(data.action == "deploy") {
    msg = [{type:"unit", unit:data.unit},
           {type:"text", text:"deploys"}];
    player = data.unit.owner;
  } else if(data.action == "undeploy") {
    msg = [{type:"unit", unit:data.unit},
           {type:"text", text:"undeploys"}];
    player = data.unit.owner;
  } else if(data.action == "load") {
    msg = [{type:"unit", unit:data.unit},
           {type:"text", text:"loads into"},
           {type:"unit", unit:data.carrier}];
    player = data.unit.owner;
  } else if(data.action == "unload") {
    msg = [{type:"unit", unit:data.unit},
           {type:"text", text:"unloads from"},
           {type:"unit", unit:data.carrier}];
    player = data.unit.owner;
  } else if(data.action == "destroyed") {
    msg = [{type:"unit", unit:data.unit},
        {type:"text", text:"is destroyed"}];
    player = data.unit.owner;
  } else if(data.action == "repair") {
    msg = [{type:"tile", tile:data.tile},
           {type:"text", text:"heals"},
           {type:"unit", unit:data.unit},
           {type:"text", text:"to " + data.newHealth + "% health"}];
    player = data.unit.owner;
  } else if(data.action == "build") {
    msg = [{type:"tile", tile:data.tile},
           {type:"text", text:"builds"},
           {type:"unit", unit:data.unit}];
    player = data.unit.owner;
  } else if(data.action == "regenerateCapturePoints") {
    msg = [{type:"tile", tile:data.tile},
           {type:"text", text:"regenerates capture points (" + data.newCapturePoints + " left)"}];
    player = data.tile.owner;
  } else if(data.action == "produceFunds") {
    msg = [{type:"tile", tile:data.tile},
           {type:"text", text:"produces funds"}];
    player = data.tile.owner;
        
  } else if(data.action == "beginTurn") {
    msg = [{type:"text", text:"Player " + data.player + "'s turn"}];
    player = data.player;
    
  } else if(data.action == "endTurn") {
    msg = [{type:"text", text:"Player " + data.player + " yields the turn"}];
    player = data.player;
    
  } else if(data.action == "turnTimeout") {
    msg = [{type:"text", text:"Player " + data.player + "'s turn timed out"}];
    player = data.player;
    
  } else if(data.action == "surrender") {
    msg = [{type:"text", text:"Player " + data.player + " surrenders!"}];
    player = data.player;
    
  } else if(data.action == "finished") {
    msg = [{type:"text", text:"Game finished! Player " + data.winner + " wins!"}];
    player = data.winner;
  } else {
    msg = [{type:"text", text:"unknown action: " + data.action}];
  }
  
  msg.unshift({type: "time", time: time});
  
  var tickerMessage = $("<li></li>");
  tickerMessage.addClass("tickerMessage");
  if(player) {
    tickerMessage.css("background-color", this.map.theme.getPlayerColorString(parseInt(player)));
  }
  this.createTickerMessage(msg, tickerMessage);
  return tickerMessage;
}

MessageTicker.prototype.createTickerMessage = function(parts, rootElement) {
  for(var i = 0; i < parts.length; ++i) {
    var part = parts[i];
    if(part.type == "text") {
      var text = $("<span></span>");
      text.text(part.text);
      rootElement.append(text);
    } else if (part.type == "time") {
      var text = $("<span></span>");
      var timeString = "[" + part.time.getFullYear() + "-" + 
                             zeroPad(part.time.getMonth()+1, 2) + "-" + 
                             zeroPad(part.time.getDate(), 2) + " " + 
                             zeroPad(part.time.getHours(), 2) + ":" + 
                             zeroPad(part.time.getMinutes(), 2) + ":" + 
                             zeroPad(part.time.getSeconds(), 2) + "] ";
      text.text(timeString);
      text.addClass("time");
      rootElement.append(text);
    } else if(part.type == "unit") {
      var image = $("<span></span>");
      image.addClass("sprite");
      image.css("background-image", "url(" + this.map.theme.getSpriteSheetUrl() + ")");
      var pos = this.map.theme.getUnitCoordinates(part.unit.type, part.unit.owner);
      var x = pos.x * this.map.tileW;
      var y = pos.y * this.map.tileH;
      image.css("background-position", -x + "px " + -y + "px");
      rootElement.append(image);
    } else if(part.type == "tile") {
      var image = $("<span></span>");
      image.addClass("sprite");
      image.css("background-image", "url(" + this.map.theme.getSpriteSheetUrl() + ")");
      var pos = this.map.theme.getTileCoordinates(part.tile.type, part.tile.subtype, part.tile.owner);
      var x = pos.x * this.map.tileW;
      var y = pos.y * this.map.tileH;
      image.css("background-position", -x + "px " + -y + "px");
      rootElement.append(image);
    }
  }
}

