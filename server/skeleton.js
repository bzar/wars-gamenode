var entities = require("./entities");

function Skeleton(client) {
  this.client = client;
  this.server = this.client.server;
  this.session = null;
  this.sessionId = null;
}

exports.Skeleton = Skeleton;

// GAME MANAGEMENT

Skeleton.prototype.createGame = function(info) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var game = new entities.Game(null, info.name, info.mapId, 'pregame', 0, 0, 0, 1, 
                               {public: info.public, turnLength: info.turnLength});
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.createGame(game, function(gameId) {
    if(gameId !== null) {
      this_.client.sendResponse(requestId, {success: true, gameId: gameId});
    } else {
      this_.client.sendResponse(requestId, {success: false});
    }
  });
}

Skeleton.prototype.joinGame = function(gameId, playerNumber) {
  
}

Skeleton.prototype.leaveGame = function(gameId, playerNumber) {
  
}

Skeleton.prototype.startGame = function(gameId) {
  
}

Skeleton.prototype.openGames = function() {
  
}

Skeleton.prototype.myGames = function() {
  var games = [];
  for(var i = 0; i < 40; ++i)
    games.push({
      name: "Hello World " + (i+1), 
      map: "TestMap", 
      players: i%4 + 1,
      state: "In progress",
      turn: ["Your turn!", "Foo", "Bar", "Baz"][i%4]
    });
  return games;
}

Skeleton.prototype.players = function(gameId) {
  
}

Skeleton.prototype.setEmailSetting = function(gameId, value) {
  
}

Skeleton.prototype.emailSetting = function(gameId) {
  
}

// MAP MANAGEMENT

Skeleton.prototype.createMap = function(mapInfo) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}
    
  var map = new entities.Map(null, this.session.userId, mapInfo.name, mapInfo.initialFunds, mapInfo.mapData);
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.createMap(map, mapInfo.mapData, function(mapId) {
    if(mapId !== null) {
      this_.client.sendResponse(requestId, {success: true, mapId: mapId});
    } else {
      this_.client.sendResponse(requestId, {success: false});
    }
  });
}

Skeleton.prototype.updateMap = function(mapInfo) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  var map = new entities.Map(mapInfo.mapId, this.session.userId, mapInfo.name, mapInfo.initialFunds, mapInfo.mapData);
  this.server.database.updateMap(map, mapInfo.mapData, function(mapId) {
    if(mapId !== null) {
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false});
    }
  });
}

Skeleton.prototype.mapData = function(mapId) {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  
  this.server.database.map(mapId, function(map) {
    if(map === null) {
      this_.client.sendResponse(requestId, {success: false});
    } else {
      this_.server.database.mapData(mapId, function(mapData) {
        if(mapData !== null) {
          this_.client.sendResponse(requestId, {success: true, name: map.name, funds: map.funds, 
                                                players: map.players, mapData: mapData});
        } else {
          this_.client.sendResponse(requestId, {success: false});
        }
      });
    }
  });
}

Skeleton.prototype.maps = function() {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.maps(function(maps) {
    if(maps !== null) {
      this_.client.sendResponse(requestId, {success: true, maps: maps});
    } else {
      this_.client.sendResponse(requestId, {success: false});
    }
  });
}

Skeleton.prototype.myMaps = function() {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.myMaps(this.session.userId, function(maps) {
    if(maps !== null) {
      this_.client.sendResponse(requestId, {success: true, maps: maps});
    } else {
      this_.client.sendResponse(requestId, {success: false});
    }
  });
}

// PROFILE MANAGEMENT

Skeleton.prototype.saveProfile = function(username, password, email, theme, defaultEmailSetting) {
  
}

Skeleton.prototype.profile = function() {
  
}

// USER MANAGEMENT

Skeleton.prototype.newSession = function(credentials) {
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.userId(credentials.username, credentials.password, function(userId) {
    if(userId !== null) {
      this_.session = {userId: userId};
      this_.sessionId = this_.server.sessionStorage.createSession(this_.session);
      this_.client.sendResponse(requestId, {success: true, sessionId: this_.sessionId});
    } else {
      this_.client.sendResponse(requestId, {success: false, sessionId: null});
    }
  });
}

Skeleton.prototype.resumeSession = function(sessionId) {
  this.session = this.server.sessionStorage.getSession(sessionId);
  this.sessionId = sessionId;
  if(this.session !== undefined) {
    return {success: true, sessionId: sessionId};
  } else {
    return {success: false, sessionId: null};
  }
}

Skeleton.prototype.closeSession = function() {
  if(this.sessionId === null)
    return {success: false, reason: "Not logged in"}

  var success = this.server.sessionStorage.deleteSession(this.sessionId);
  return {success: success};
}

Skeleton.prototype.register = function(userInfo) {
  var user = new entities.User(null, userInfo.username, userInfo.password, userInfo.email, 
                               {emailNotifications: true, gameTheme: "default"});
  var requestId = this.client.requestId;
  var this_ = this;
  this.server.database.register(user, function(userId) {
    if(userId !== null) {
      this_.client.sendResponse(requestId, {success: true});
    } else {
      this_.client.sendResponse(requestId, {success: false, reason: "Username exists!"});
    }
  });
}

// GAME

Skeleton.prototype.gameRules = function(gameId) {
  var elements = this.server.settings.gameElements;
  var rules = {
    armors: elements.armors,
    units: elements.unitTypes,
    terrains: elements.terrains,
    weapons: elements.weapons,
    terrainFlags: elements.terrainFlags,
    unitClasses: elements.unitClasses,
    movementTypes: elements.movement,
    unitFlags: elements.unitFlags
  }
  
  if(gameId !== null) {
    rules.bannedUnits = [];
  }
  
  return rules;
}

Skeleton.prototype.gameData = function(gameId) {
  
}

Skeleton.prototype.myFunds = function(gameId) {
  
}

Skeleton.prototype.turnRemaining = function(gameId) {
  
}

Skeleton.prototype.subscribeGame = function(gameId) {
  
}

Skeleton.prototype.unsubscribeGame = function(gameId) {
  
}

Skeleton.prototype.move = function(gameId, unitId, destination) {
  
}

Skeleton.prototype.moveAndAttack = function(gameId, unitId, destination, targetId ) {
  
}

Skeleton.prototype.moveAndWait = function(gameId, unitId, destination) {
  
}

Skeleton.prototype.moveAndCapture = function(gameId, unitId, destination) {
  
}

Skeleton.prototype.moveAndDeploy = function(gameId, unitId, destination) {
  
}

Skeleton.prototype.undeploy = function(gameId, unitId) {
  
}

Skeleton.prototype.load = function(gameId, unitId, carrierId) {
  
}

Skeleton.prototype.unload = function(gameId, carrierId, unitId, destination) {
  
}

Skeleton.prototype.build = function(gameId, unitType, destination) {
  
}

Skeleton.prototype.endTurn = function(gameId) {
  
}

Skeleton.prototype.surrender = function(gameId) {
  
}

// CHAT

Skeleton.prototype.chatMessages = function(gameId) {
  
}

Skeleton.prototype.chat = function(gameId, message) {
  
}

// GAME EVENT TICKER

Skeleton.prototype.tickerMessages = function(gameId, count) {
  
}

// GAME STATISTICS

Skeleton.prototype.gameStatistics = function(gameId) {
  
}

Skeleton.prototype.lastTurnStatistics = function(gameId) {
  
}