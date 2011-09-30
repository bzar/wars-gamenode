var fs = require('fs');

var entities = require("../../entities");
var settings = require("../../settings").settings;
var utils = require("../../utils");
var DummyDatabase = require("./dummy").implementation;

var JSONFileDatabase = function() {
  this.database = null;
  this.databaseFilename = 'database.json';
}

JSONFileDatabase.prototype = new DummyDatabase();

exports.implementation = JSONFileDatabase;

var Database = function() {
  this.users = new Array();
  this.userIdCounter = 0;
  this.maps = new Array();
  this.mapIdCounter = 0;
  this.games = new Array();
  this.gameIdCounter = 0;
  this.players = new Array();
  this.playerIdCounter = 0;
  this.tiles = new Array();
  this.tileIdCounter = 0;
  this.units = new Array();
  this.unitIdCounter = 0;
  this.chatMessages = new Array();
  this.chatMessageIdCounter = 0;
  this.gameEvents = new Array();
  this.gameEventIdCounter = 0;
  this.gameStatistics = new Array();
  this.gameStatisticIdCounter = 0;
};

Database.prototype.user = function(userId) {
  for(var i = 0; i < this.users.length; ++i) {
    if(this.users[i].userId == userId) {
      return this.users[i];
    }
  }
  return null;
};

Database.prototype.map = function(mapId) {
  for(var i = 0; i < this.maps.length; ++i) {
    if(this.maps[i].mapId == mapId) {
      return this.maps[i];
    }
  }
  return null;
};

Database.prototype.game = function(gameId) {
  for(var i = 0; i < this.games.length; ++i) {
    if(this.games[i].gameId == gameId) {
      return this.games[i];
    }
  }
  return null;
};

Database.prototype.player = function(playerId) {
  for(var i = 0; i < this.players.length; ++i) {
    if(this.players[i].playerId == playerId) {
      return this.players[i];
    }
  }
  return null;
};

Database.prototype.tile = function(tileId) {
  for(var i = 0; i < this.tiles.length; ++i) {
    if(this.tiles[i].tileId == tileId) {
      return this.tiles[i];
    }
  }
  return null;
};

Database.prototype.unit = function(unitId) {
  for(var i = 0; i < this.units.length; ++i) {
    if(this.units[i].unitId == unitId) {
      return this.units[i];
    }
  }
  return null;
};

JSONFileDatabase.prototype.loadDatabase = function(callback) {
  var this_ = this;
  if(this.database === null) {
    fs.readFile(this.databaseFilename, 'utf8', function(err, data) {
      if(err || data == "") {
	this_.database = new Database();
	this_.saveDatabase(function() {
	  callback(this_.database);
	});
      } else {
	this_.database = new Database();
	var databaseContent = JSON.parse(data);
        
        this_.database.userIdCounter = databaseContent.userIdCounter;
	for(var i = 0; i < databaseContent.users.length; ++i) {
          var item = databaseContent.users[i];
	  var user = new entities.User(item.userId, item.username, item.password, item.email, item.settings);
          this_.database.users.push(user);
	}
	
	this_.database.mapIdCounter = databaseContent.mapIdCounter;
	for(var i = 0; i < databaseContent.maps.length; ++i) {
          var item = databaseContent.maps[i];
          var map = new entities.Map(item.mapId, item.authorId, item.name, item.funds, item.mapData);
          map.mapData = item.mapData;
          this_.database.maps.push(map);
        }
        
        this_.database.tileIdCounter = databaseContent.tileIdCounter;
        for(var i = 0; i < databaseContent.tiles.length; ++i) {
          var item = databaseContent.tiles[i];
          var tile = new entities.Tile(item.tileId, item.gameId, item.x, item.y, item.type, 
                                      item.subtype, item.owner, item.unitId, item.capturePoints, 
                                      item.beingCaptured);
          this_.database.tiles.push(tile);
        }
        
        this_.database.unitIdCounter = databaseContent.unitIdCounter;
        for(var i = 0; i < databaseContent.units.length; ++i) {
          var item = databaseContent.units[i];
          var unit = new entities.Unit(item.unitId, item.tileId, item.type, item.owner, item.carriedBy, 
                                       item.health, item.deployed, item.moved, item.capturing);
          this_.database.units.push(unit);
        }
        
        this_.database.playerIdCounter = databaseContent.playerIdCounter;
        for(var i = 0; i < databaseContent.players.length; ++i) {
          var item = databaseContent.players[i];
          var player = new entities.Player(item.playerId, item.gameId, item.userId, item.playerNumber, item.playerName, item.funds, item.score, 
                     {emailNotifications: item.settings.emailNotifications});
          this_.database.players.push(player);
        }
        
        this_.database.gameIdCounter = databaseContent.gameIdCounter;
        for(var i = 0; i < databaseContent.games.length; ++i) {
          var item = databaseContent.games[i];
          var game = new entities.Game(item.gameId, item.authorId, item.name, item.mapId, item.state, item.turnStart, 
                   item.turnNumber, item.roundNumber, item.inTurnNumber, 
                   {public: item.settings.public, turnLength: item.settings.turnLength});
          this_.database.games.push(game);
        }
        
        this_.database.chatMessageIdCounter = databaseContent.chatMessageIdCounter;
        for(var i = 0; i < databaseContent.chatMessages.length; ++i) {
          var item = databaseContent.chatMessages[i];
          var chatMessage = new entities.ChatMessage(item.chatMessageId, item.gameId, item.userId, item.time, item.content);
          this_.database.chatMessages.push(chatMessage);
        }
        
        this_.database.gameEventIdCounter = databaseContent.gameEventIdCounter;
        for(var i = 0; i < databaseContent.gameEvents.length; ++i) {
          var item = databaseContent.gameEvents[i];
          var gameEvent = new entities.GameEvent(item.gameEventId, item.gameId, item.time, item.content);
          this_.database.gameEvents.push(gameEvent);
        }
        
        this_.database.gameStatisticIdCounter = databaseContent.gameStatisticIdCounter;
        for(var i = 0; i < databaseContent.gameStatistics.length; ++i) {
          var item = databaseContent.gameStatistics[i];
          var gameStatistic = new entities.GameStatistic(item.gameStatisticId, item.gameId, item.turnNumber, 
                                                         item.roundNumber, item.inTurnNumber, item.content);
          this_.database.gameStatistics.push(gameStatistic);
        }
        
        callback(this_.database);
      }
    });
  } else {
    setTimeout(function() {
      callback(this_.database);
    }, 0);
  }
}

JSONFileDatabase.prototype.saveDatabase = function(callback) {
  var this_ = this;
  setTimeout(function() {
    var databaseContent = JSON.stringify(this_.database);
    fs.writeFile(this_.databaseFilename, databaseContent, function() {
      callback();
    });
  }, 0);
}


// GAME MANAGEMENT

JSONFileDatabase.prototype.game = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.game");
  var this_ = this;
  this.loadDatabase(function(database) {
    var game = database.game(gameId);
    if(game === null) {
      callback({success: false, reason: "No such game!"});
    } else {
      timer.end();
      callback({success: true, game: game.clone()});
    }
  });
}

JSONFileDatabase.prototype.createGame = function(game, gameData, players, callback) {
  var timer = new utils.Timer("JSONFileDatabase.createGame");
  var this_ = this;
  this.loadDatabase(function(database) {
    var newGame = game.clone();
    newGame.gameId = database.gameIdCounter;
    database.gameIdCounter += 1;
    database.games.push(newGame);
    
    for(var i = 0; i < gameData.length; ++i) {
      var tile = gameData[i].clone();
      var unit = gameData[i].unit !== null ? gameData[i].unit.clone() : null;
      tile.gameId = newGame.gameId;
      tile.tileId = database.tileIdCounter;
      database.tileIdCounter += 1;
      
      if(unit !== null) {
        unit.unitId = database.unitIdCounter;
        database.unitIdCounter += 1;
        tile.unitId = unit.unitId;
        unit.tileId = tile.tileId;
        database.units.push(unit);
      }
      
      database.tiles.push(tile);
    }
    
    for(var i = 0; i < players.length; ++i) {
      var player = players[i].clone();
      player.playerId = database.playerIdCounter; 
      database.playerIdCounter += 1;
      player.gameId = newGame.gameId;
      database.players.push(player);
    }
    
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true, gameId: newGame.gameId});
    });
  });
}

JSONFileDatabase.prototype.updateGame = function(game, callback) {
  var timer = new utils.Timer("JSONFileDatabase.updateGame");
  var this_ = this;
  this.loadDatabase(function(database) {
    var existingGame = database.game(game.gameId);
    if(existingGame === null) {
      callback({success: false, reason: "Game does not exist!"});
      return;
    }
    existingGame.cloneFrom(game);
    
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });    
  });
}
JSONFileDatabase.prototype.deleteGame = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.deleteGame");
  var this_ = this;
  this.loadDatabase(function(database) {
    var game = database.game(gameId);
    if(game === null) {
      callback({success: false, reason: "Game does not exist!"});
      return;
    }
    
    for(var i = 0; i < database.games.length; ++i) {
      if(database.games[i].gameId == gameId) {
        database.games.splice(i, 1);
        break;
      }
    }
    
    var start = null;
    for(var i = 0; i < database.players.length; ++i) {
      if(database.players[i].gameId == gameId) {
        if(start === null)
          start = i;
      } else if(start !== null) {
        database.players.splice(start, i - start);
        i -= i - start;
        start = null;
      }
    }
    if(start !== null) {
      database.players.splice(start);
      start = null;
    }
    
    var unitIds = [];
    for(var i = 0; i < database.tiles.length; ++i) {
      if(database.tiles[i].gameId == gameId) {
        if(start === null)
          start = i;
        if(database.tiles[i].unitId !== null) {
          unitIds.push(database.tiles[i].unitId);
        }
      } else if(start !== null) {
        database.tiles.splice(start, i - start);
        i -= i - start;
        start = null;
      }
    }
    if(start !== null) {
      database.tiles.splice(start);
      start = null;
    }
    
    for(var i = 0; i < database.units.length; ++i) {
      if(unitIds.indexOf(database.units[i].carriedBy) != -1) {
        unitIds.push(database.units[i].unitId);
      }
    }
    
    for(var i = 0; i < database.units.length; ++i) {
      if(unitIds.indexOf(database.units[i].unitId) != -1) {
        if(start === null)
          start = i;
      } else if(start !== null) {
        database.units.splice(start, i - start);
        i -= i - start;
        start = null;
      }
    }
    if(start !== null) {
      database.units.splice(start);
      start = null;
    }
    
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });
  });
}

JSONFileDatabase.prototype.openGames = function(callback) {
  var timer = new utils.Timer("JSONFileDatabase.openGames");
  var this_ = this;
  this.loadDatabase(function(database) {
    var openGames = [];
    for(var i = 0; i < database.games.length; ++i) {
      var game = database.games[i];
      if(game.settings.public && game.state == game.STATE_PREGAME) {
        var numPlayers = 0;
        for(var j = 0; j < database.players.length; ++j) {
          var player = database.players[j];
          if(player.gameId == game.gameId) {
            if(player.userId !== null) {
              numPlayers += 1;
            }
          }
        }
        
        var map = database.map(game.mapId);
        if(numPlayers < map.players) {
          var openGame = game.clone();
          openGame.map = map.clone();
          openGame.map.mapData = undefined;
          openGame.numPlayers = numPlayers;
          openGames.push(openGame);
        }
      }
    }
    
    timer.end();
    callback({success: true, games: openGames});
  });
}

JSONFileDatabase.prototype.publicGames = function(callback) {
  var timer = new utils.Timer("JSONFileDatabase.publicGames");
  var this_ = this;
  this.loadDatabase(function(database) {
    var publicGames = [];
    for(var i = 0; i < database.games.length; ++i) {
      var game = database.games[i];
      if(game.settings.public && game.state == game.STATE_IN_PROGRESS) {
        var numPlayers = 0;
        for(var j = 0; j < database.players.length; ++j) {
          var player = database.players[j];
          if(player.gameId == game.gameId) {
            if(player.userId !== null) {
              numPlayers += 1;
            }
          }
        }

        var map = database.map(game.mapId);
        var publicGame = game.clone();
        publicGame.map = map.clone();
        publicGame.map.mapData = undefined;
        publicGame.numPlayers = numPlayers;
        publicGames.push(publicGame);
      }
    }
    
    timer.end();
    callback({success: true, games: publicGames});
  });
}

JSONFileDatabase.prototype.myGames = function(userId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.myGames");
  var this_ = this;
  this.loadDatabase(function(database) {
    var myGames = [];
    
    for(var i = 0; i < database.games.length; ++i) {
      var game = database.games[i];
      var isMyGame = game.authorId == userId;
      var numPlayers = 0;
      for(var j = 0; j < database.players.length; ++j) {
        var player = database.players[j];
        if(player.gameId == game.gameId) {
          if(player.userId !== null) {
            numPlayers += 1;
          }
          if(player.userId == userId && !player.settings.hidden) {
            isMyGame = true;
          }
        }
      }
      
      if(isMyGame) {
        var map = database.map(game.mapId);
        var myGame = game.clone();
        myGame.map = map.clone();
        myGame.map.mapData = undefined;
        myGame.numPlayers = numPlayers;
        myGames.push(myGame);
      }
    }
    
    timer.end();
    callback({success: true, games: myGames});
  });
}

JSONFileDatabase.prototype.players = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.players");
  var this_ = this;
  this.loadDatabase(function(database) {
    var players = [];
    for(var i = 0; i < database.players.length; ++i) {
      var player = database.players[i];
      if(player.gameId == gameId) {
        players.push(player.clone());
      }
    }
    
    if(players.length != 0) {
      timer.end();
      callback({success: true, players: players});
    } else {
      callback({success: false, reason: "No players for such game!"});
    }
  });
}

JSONFileDatabase.prototype.playersWithUsers = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.playersWithUsers");
  var this_ = this;
  this.loadDatabase(function(database) {
    var players = [];
    for(var i = 0; i < database.players.length; ++i) {
      var player = database.players[i];
      if(player.gameId == gameId) {
        player = player.clone();
        if(player.userId === null) {
          player.user = null;
        } else {
          player.user = database.user(player.userId).clone();
        }
        players.push(player);
      }
    }
    
    if(players.length != 0) {
      timer.end();
      callback({success: true, players: players});
    } else {
      callback({success: false, reason: "No players for such game!"});
    }
  });
}

JSONFileDatabase.prototype.gamePlayer = function(gameId, playerNumber, callback) {
  var timer = new utils.Timer("JSONFileDatabase.gamePlayer");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < database.players.length; ++i) {
      var player = database.players[i];
      if(player.gameId == gameId && player.playerNumber == playerNumber) {
        timer.end();
        callback({success: true, player: player.clone()});
        return;
      }
    }
    callback({success: false, reason: "No such player!"});
  });
}

JSONFileDatabase.prototype.userPlayerInTurn = function(gameId, userId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.userPlayerInTurn");
  var this_ = this;
  this.loadDatabase(function(database) {
    var game = this_.database.game(gameId);
    if(game === null) {
      callback({success: false, reason: "No such game!"});
      return;
    }
    
    for(var i = 0; i < database.players.length; ++i) {
      var player = database.players[i];
      if(player.gameId == gameId && player.userId == userId && player.playerNumber == game.inTurnNumber) {
        timer.end();
        callback({success: true, player: player.clone()});
        return;
      }
    }
    callback({success: false, reason: "User not in turn or not a player!"});
  });
}

JSONFileDatabase.prototype.player = function(playerId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.player");
  var this_ = this;
  this.loadDatabase(function(database) {
    var player = database.player(playerId);
    if(player === null) {
      callback({success: false, reason: "No such player!"});
    } else {
      timer.end();
      callback({success: true, player: player});
    }
  });
}


JSONFileDatabase.prototype.updatePlayer = function(player, callback) {
  this.updatePlayers([player], callback);
}

JSONFileDatabase.prototype.updatePlayers = function(players, callback) {
  var timer = new utils.Timer("JSONFileDatabase.updatePlayers");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < players.length; ++i) {
      var existingPlayer = database.player(players[i].playerId);
      if(existingPlayer === null) {
        callback({success: false, reason: "Player does not exist!"});
        return;
      }
      existingPlayer.cloneFrom(players[i]);
    }
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });    
  });
}

// MAP MANAGEMENT

JSONFileDatabase.prototype.createMap = function(newMap, callback) {
  var timer = new utils.Timer("JSONFileDatabase.createMap");
  var this_ = this;
  this.loadDatabase(function(database) {
    var map = newMap.clone();
    map.mapId = database.mapIdCounter;
    database.mapIdCounter += 1;
    database.maps.push(map);
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true, mapId: map.mapId});
    });
  });
}

JSONFileDatabase.prototype.updateMap = function(map, callback) {
  var timer = new utils.Timer("JSONFileDatabase.updateMap");
  var this_ = this;
  this.loadDatabase(function(database) {
    var existingMap = database.map(map.mapId);
    if(existingMap === null) {
      callback({success: false, reason: "Map does not exist!"});
      return;
    }
    existingMap.cloneFrom(map);
    
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });    
  });
}

JSONFileDatabase.prototype.map = function(mapId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.map");
  var this_ = this;
  this.loadDatabase(function(database) {
    var map = database.map(mapId);
    if(map === null) {
      callback({success: false, reason: "No such map!"});
    } else {
      var resultMap = map.clone();
      resultMap.mapData = undefined;
      timer.end();
      callback({success: true, map: resultMap});
    }
  });
}

JSONFileDatabase.prototype.mapData = function(mapId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.mapData");
  var this_ = this;
  this.loadDatabase(function(database) {
    var map = database.map(mapId);
    if(map === null) {
      callback({success: false, reason: "No such map!"});
    } else {
      var mapData = map.clone().mapData;
      timer.end();
      callback({success: true, mapData: mapData});
    }
  });
}

JSONFileDatabase.prototype.maps = function(callback) {
  var timer = new utils.Timer("JSONFileDatabase.maps");
  var this_ = this;
  this.loadDatabase(function(database) {
    var maps = []
    for(var i = 0; i < database.maps.length; ++i) {
      var map = database.maps[i].clone();
      map.mapData = undefined;
      maps.push(map);
    }
    
    timer.end();
    callback({success: true, maps: maps});
  });
}

JSONFileDatabase.prototype.myMaps = function(userId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.myMaps");
  var this_ = this;
  this.loadDatabase(function(database) {
    var maps = []
    for(var i = 0; i < database.maps.length; ++i) {
      if(database.maps[i].authorId == userId) {
        var map = database.maps[i].clone();
        map.mapData = undefined;
        maps.push(map);
      }
    }
    
    timer.end();
    callback({success: true, maps: maps});
  });
}

// USER MANAGEMENT

JSONFileDatabase.prototype.userByName = function(username, callback) {
  var timer = new utils.Timer("JSONFileDatabase.userId");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < database.users.length; ++i) {
      var user = database.users[i];
      if(user.username == username) {
        timer.end();
        callback({success: true, user: user.clone()});
        return;
      }
    }
    
    callback({success: false, reason: "No such user!"});
  });
}

JSONFileDatabase.prototype.user = function(userId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.user");
  var this_ = this;
  this.loadDatabase(function(database) {
    var user = database.user(userId);
    if(user === null) {
      callback({success: false, reason: "No such user!"});
    } else {
      timer.end();
      callback({success: true, user: user.clone()});
    }
  });
}

JSONFileDatabase.prototype.updateUser = function(user, callback) {
  var timer = new utils.Timer("JSONFileDatabase.updateUser");
  var this_ = this;
  this.loadDatabase(function(database) {
    var existingUser = database.user(user.userId);
    if(existingUser === null) {
      callback({success: false, reason: "User does not exist!"});
      return;
    }
    
    for(var i = 0; i < database.users.length; ++i) {
      if(database.users[i].userId != user.userId && database.users[i].username == user.username) {
        callback({success: false, reason: "Username already exists!"});
        return;
      }
    }
    existingUser.cloneFrom(user);
    
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });    
  });
}

JSONFileDatabase.prototype.register = function(newUser, callback) {
  var timer = new utils.Timer("JSONFileDatabase.register");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < database.users.length; ++i) {
      var user = database.users[i];
      if(user.username == newUser.username) {
        callback({success: false, reason: "Username already exists!"});
        return;
      }
    }
    
    var user = newUser.clone();
    user.userId = database.userIdCounter;
    database.userIdCounter += 1;
    database.users.push(user);
    
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true, userId: user.userId});
    });
  });
}

// GAME ENTITY MANAGEMENT

function getCarriedUnits(database, unit) {
  unit.carriedUnits = [];
  if(unit.unitType().carryNum > 0) {
    for(var i = 0; i < database.units.length; ++i) {
      var carriedUnit = database.units[i];
      if(carriedUnit.carriedBy == unit.unitId) {
        carriedUnit = carriedUnit.clone();
        getCarriedUnits(database, carriedUnit);
        unit.carriedUnits.push(carriedUnit);
      }
    }
  }
}

JSONFileDatabase.prototype.unit = function(unitId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.unit");
  var this_ = this;
  this.loadDatabase(function(database) {
    var unit = database.unit(unitId);
    if(unit === null) {
      callback({success: false, reason: "No such unit!"});
    } else {
      unit = unit.clone();
      getCarriedUnits(database, unit);
      timer.end();
      callback({success: true, unit: unit});
    }
  });
}

JSONFileDatabase.prototype.unitAt = function(gameId, x, y, callback) {
  var timer = new utils.Timer("JSONFileDatabase.unitAt");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < database.tiles.length; ++i) {
      var tile = database.tiles[i];
      if(tile.gameId == gameId && tile.x == x && tile.y = y) {
        if(tile.unitId === null) {
          callback({success: true, unit: null})
        } else {
          var unit = database.unit(tile.unitId);
          if(unit !== null) {
            unit = unit.clone();
            getCarriedUnits(database, unit);
          }
          callback({success: true, unit: unit})
          return;
        }
      }
    }
    callback({success: false, reason: "No such tile!"});
  });
}

JSONFileDatabase.prototype.units = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.units");
  var this_ = this;
  this.loadDatabase(function(database) {
    var units = [];
    for(var i = 0; i < database.tiles.length; ++i) {
      var tile = database.tiles[i];
      if(tile.gameId == gameId && tile.unitId !== null) {
        var unit = database.unit(tile.unitId).clone();
        getCarriedUnits(database, unit);
        units.push(unit);
      }
    }
    
    timer.end();
    callback({success: true, units: units});
  });
}

JSONFileDatabase.prototype.playerUnits = function(gameId, playerNumber, callback) {
  var timer = new utils.Timer("JSONFileDatabase.playerUnits");
  var this_ = this;
  this.loadDatabase(function(database) {
    var units = [];
    for(var i = 0; i < database.tiles.length; ++i) {
      var tile = database.tiles[i];
      if(tile.gameId == gameId && tile.unitId !== null) {
        var unit = database.unit(tile.unitId);
        if(unit.owner == playerNumber) {
          unit = unit.clone();
          getCarriedUnits(database, unit);
          units.push(unit);
        }
      }
    }
    
    timer.end();
    callback({success: true, units: units});
  });
}

JSONFileDatabase.prototype.createUnit = function(gameId, newUnit, callback) {
  var timer = new utils.Timer("JSONFileDatabase.createUnit");
  var this_ = this;
  this.loadDatabase(function(database) {
    var unit = newUnit.clone();
    unit.unitId = database.unitIdCounter;
    database.unitIdCounter += 1;
    database.units.push(unit);
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true, unitId: unit.unitId});
    });
  });
}

JSONFileDatabase.prototype.updateUnit = function(unit, callback) {
  return this.updateUnits([unit], callback);
}

JSONFileDatabase.prototype.updateUnits = function(units, callback) {
  var timer = new utils.Timer("JSONFileDatabase.updateUnits");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < units.length; ++i) {
      var unit = units[i];
      var existingUnit = database.unit(unit.unitId);
      if(existingUnit === null) {
        callback({success: false, reason: "Unit does not exist!"});
        return;
      }
      existingUnit.cloneFrom(unit);
    
      if(unit.carriedUnits !== undefined) {
        for(var j = 0; j < unit.carriedUnits.length; ++j) {
          var carriedUnit = database.unit(unit.carriedUnits[j].unitId);
          if(carriedUnit === null) {
            callback({success: false, reason: "Unit does not exist!"});
            return;
          }
          carriedUnit.cloneFrom(unit.carriedUnits[j]);
        }
      }
    }
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });    
  });
}

JSONFileDatabase.prototype.deleteUnit = function(unit, callback) {
  return this.deleteUnits([unit], callback);
}

JSONFileDatabase.prototype.deleteUnits = function(units, callback) {
  var timer = new utils.Timer("JSONFileDatabase.deleteUnits");
  var this_ = this;
  this.loadDatabase(function(database) {
    function d(unitId, ids) {
      if(ids === undefined)
        ids = [];
      
      for(var i = 0; i < database.units.length; ++i) {
        if(database.units[i].unitId == unitId) {
          ids.push(database.units[i].unitId)
        } else if(database.units[i].carriedBy == unitId) {
          d(database.units[i].unitId, ids);
        }
      }
      return ids;
    }
    
    for(var k = 0; k < units.length; ++k) {
      var ids = d(units[k].unitId);
      
      if(ids.length == 0) {
        callback({success: false, reason: "No such unit!"}); return;
      } 
      
      for(var i = 0; i < ids.length; ++i) {
        for(var j = 0; j < database.units.length; ++j) {
          if(ids[i] == database.units[j].unitId) {
            if(database.units[j].tileId !== null) {
              var tile = database.tile(database.units[j].tileId);
              tile.unitId = null;
            }
            
            database.units.splice(j, 1);
            j -= 1;
          }
        }
      }
    }
    
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });
  });
}

JSONFileDatabase.prototype.tile = function(tileId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.tile");
  var this_ = this;
  this.loadDatabase(function(database) {
    var tile = database.tile(tileId);
    if(tile === null) {
      callback({success: false, reason: "No such tile!"});
    } else {
      timer.end();
      callback({success: true, tile: tile.clone()});
    }
  });
}

JSONFileDatabase.prototype.tileAt = function(gameId, x, y, callback) {
  var timer = new utils.Timer("JSONFileDatabase.tileAt");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < database.tiles.length; ++i) {
      var tile = database.tiles[i];
      if(tile.gameId == gameId && tile.x == x && tile.y == y) {
        callback({success: true, tile: tile.clone()})
        return;
      }
    }
    callback({success: false, reason: "No such tile!"});
  });
}

JSONFileDatabase.prototype.tiles = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.tiles");
  var this_ = this;
  this.loadDatabase(function(database) {
    var tiles = [];
    for(var i = 0; i < database.tiles.length; ++i) {
      var tile = database.tiles[i];
      if(tile.gameId == gameId) {
        tiles.push(tile.clone());
      }
    }
    
    timer.end();
    callback({success: true, tiles: tiles});
  });
}

JSONFileDatabase.prototype.playerTiles = function(gameId, playerNumber, callback) {
  var timer = new utils.Timer("JSONFileDatabase.playerTiles");
  var this_ = this;
  this.loadDatabase(function(database) {
    var tiles = [];
    for(var i = 0; i < database.tiles.length; ++i) {
      var tile = database.tiles[i];
      if(tile.gameId == gameId && tile.owner == playerNumber) {
        tiles.push(tile.clone());
      }
    }
    
    timer.end();
    callback({success: true, tiles: tiles});
  });
}

JSONFileDatabase.prototype.updateTile = function(tile, callback) {
  return this.updateTiles([tile], callback);
}

JSONFileDatabase.prototype.updateTiles = function(tiles, callback) {
  var timer = new utils.Timer("JSONFileDatabase.updateTiles");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < tiles.length; ++i) {
      var tile = tiles[i];
      var existingTile = database.tile(tile.tileId);
      if(existingTile === null) {
        callback({success: false, reason: "Tile does not exist!"});
        return;
      }
      existingTile.cloneFrom(tile);
    }
    
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });    
  });
}

// CHAT

JSONFileDatabase.prototype.createChatMessage = function(newChatMessage, callback) {
  var timer = new utils.Timer("JSONFileDatabase.createChatMessage");
  var this_ = this;
  this.loadDatabase(function(database) {
    var chatMessage = newChatMessage.clone();
    chatMessage.chatMessageId = database.chatMessageIdCounter;
    database.chatMessageIdCounter += 1;
    database.chatMessages.push(chatMessage);
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true, chatMessageId: chatMessage.chatMessageId});
    });
  });
}

JSONFileDatabase.prototype.chatMessages = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.chatMessages");
  var this_ = this;
  this.loadDatabase(function(database) {
    var chatMessages = [];
    for(var i = 0; i < database.chatMessages.length; ++i) {
      var chatMessage = database.chatMessages[i];
      if(chatMessage.gameId == gameId) {
        chatMessage = chatMessage.clone();
        chatMessage.sender = database.user(chatMessage.userId).username;
        chatMessages.push(chatMessage);
      }
    }
    
    timer.end();
    callback({success: true, chatMessages: chatMessages});
  });
}

// GAME EVENTS

JSONFileDatabase.prototype.createGameEvent = function(newGameEvent, callback) {
  this.createGameEvents([newGameEvent], callback);
}

JSONFileDatabase.prototype.createGameEvents = function(newGameEvents, callback) {
  var timer = new utils.Timer("JSONFileDatabase.createGameEvents");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < newGameEvents.length; ++i) {
      var gameEvent = newGameEvents[i].clone();
      gameEvent.gameEventId = database.gameEventIdCounter;
      database.gameEventIdCounter += 1;
      database.gameEvents.push(gameEvent);
    }
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });
  });
}

JSONFileDatabase.prototype.gameEvents = function(gameId, first, count, callback) {
  var timer = new utils.Timer("JSONFileDatabase.gameEvents");
  var this_ = this;
  this.loadDatabase(function(database) {
    var gameEvents = [];
    var n = 0;
    for(var i = database.gameEvents.length - 1; i >= 0 ; --i) {
      var gameEvent = database.gameEvents[i];
      if(gameEvent.gameId == gameId) {
        if(n >= first && (!count || n < count + first)) {
          gameEvents.push(gameEvent.clone());
        }
        n = n + 1;
      }
    }
    
    timer.end();
    callback({success: true, gameEvents: gameEvents});
  });
}

// GAME STATISTICS

JSONFileDatabase.prototype.createGameStatistic = function(newGameStatistic, callback) {
  this.createGameStatistics([newGameStatistic], callback);
}

JSONFileDatabase.prototype.createGameStatistics = function(newGameStatistics, callback) {
  var timer = new utils.Timer("JSONFileDatabase.createGameStatistics");
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < newGameStatistics.length; ++i) {
      var gameStatistic = newGameStatistics[i].clone();
      gameStatistic.gameStatisticId = database.gameStatisticIdCounter;
      database.gameStatisticIdCounter += 1;
      database.gameStatistics.push(gameStatistic);
    }
    this_.saveDatabase(function() {
      timer.end();
      callback({success: true});
    });
  });
}

JSONFileDatabase.prototype.gameStatistics = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.gameStatistics");
  var this_ = this;
  this.loadDatabase(function(database) {
    var gameStatistics = [];
    for(var i = 0; i < database.gameStatistics.length; ++i) {
      var gameStatistic = database.gameStatistics[i];
      if(gameStatistic.gameId == gameId) {
        gameStatistics.push(gameStatistic.clone());
      }
    }
    
    timer.end();
    callback({success: true, gameStatistics: gameStatistics});
  });
}

JSONFileDatabase.prototype.gameLatestStatistic = function(gameId, callback) {
  var timer = new utils.Timer("JSONFileDatabase.gameStatistics");
  var this_ = this;
  this.loadDatabase(function(database) {
    var latestStatistic = null;
    for(var i = 0; i < database.gameStatistics.length; ++i) {
      var gameStatistic = database.gameStatistics[i];
      if(gameStatistic.gameId == gameId && (latestStatistic === null || gameStatistic.turnNumber > latestStatistic.turnNumber)) {
        latestStatistic = gameStatistic.clone();
      }
    }
    
    timer.end();
    callback({success: true, latestStatistic: latestStatistic});
  });
}