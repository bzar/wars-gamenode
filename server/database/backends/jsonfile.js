var fs = require('fs');

var entities = require("../../entities");
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
  var this_ = this;
  this.loadDatabase(function(database) {
    callback(database.games[gameId]);
  });
}

JSONFileDatabase.prototype.createGame = function(game, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    game.gameId = database.gameIdCounter;
    database.gameIdCounter += 1;
    database.games.push(game);
    
    var playerIds = {};
    for(var i = 0; i < database.players.length; ++i) {
      var p = database.players[i];
      if(p.gameId == game.mapId) {
	var player = p.clone();
        player.playerId = database.playerIdCounter;
        database.playerIdCounter += 1;
        player.gameId = game.gameId;
        database.players.push(player);
        playerIds[p.playerId] = player.playerId;
      }
    }
    
    var tiles = [];
    for(var i = 0; i < database.tiles.length; ++i) {
      var t = database.tiles[i];
      if(t.gameId == game.mapId) {
        var tile = t.clone();
        tile.tileId = database.tileIdCounter;
        database.tileIdCounter += 1;
        tile.gameId = game.gameId;
        if(tile.ownerId !== null)
          tile.ownerId = playerIds[tile.ownerId];
        database.tiles.push(tile);
      }
    }
            
    this_.saveDatabase(function() {
      callback(game.gameId);
    });
  });
}

JSONFileDatabase.prototype.joinGame = function(userId, gameId, playerNumber, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    var game = database.game(gameId);
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.leaveGame = function(userId, gameId, playerNumber, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.startGame = function(gameId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.deleteGame = function(gameId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.openGames = function(callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.myGames = function(userId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.players = function(gameId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.player = function(gameId, playerId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.updatePlayer = function(gameId, playerId, player, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

// MAP MANAGEMENT

JSONFileDatabase.prototype.createMap = function(newMap, mapData, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    var map = newMap.clone();
    map.mapId = database.mapIdCounter;
    database.mapIdCounter += 1;
    map.mapData = mapData;
    database.maps.push(map);
    this_.saveDatabase(function() {
      callback(map.mapId);
    });
  });
}

JSONFileDatabase.prototype.updateMap = function(newMap, mapData, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    var map = database.map(newMap.mapId);
    if(map === null) {
      callback(null);
      return;
    }
    map.name = newMap.name;
    map.authorId = newMap.authorId;
    map.funds = newMap.funds;
    map.mapData = mapData;
    map.parseInfo(mapData);
    this_.saveDatabase(function() {
      callback(newMap.mapId);
    });
  });
}

JSONFileDatabase.prototype.map = function(mapId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    var map = database.map(mapId);
    callback(map.clone());
  });
}

JSONFileDatabase.prototype.mapData = function(mapId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    var map = database.map(mapId);
    callback(map.mapData);
  });
}

JSONFileDatabase.prototype.maps = function(callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    var maps = []
    for(var i = 0; i < database.maps.length; ++i) {
      maps.push(database.maps[i].clone());
    }
    
    callback(maps);
  });
}

JSONFileDatabase.prototype.myMaps = function(userId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    var maps = []
    for(var i = 0; i < database.maps.length; ++i) {
      if(database.maps[i].authorId == userId) {
        maps.push(database.maps[i].clone());
      }
    }
    
    callback(maps);
  });
}

// PROFILE MANAGEMENT

JSONFileDatabase.prototype.saveProfile = function(userId, profile, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.profile = function(userId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

// USER MANAGEMENT

JSONFileDatabase.prototype.userId = function(username, password, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < database.users.length; ++i) {
      var user = database.users[i];
      if(user.username == username && user.password == password) {
        callback(user.userId);
        return;
      }
    }
    
    callback(null);
  });
}

JSONFileDatabase.prototype.user = function(userId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    callback(database.user(userId));
  });
}

JSONFileDatabase.prototype.updateUser = function(userId, newUser, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    var user = database.user(userId);
    user.username = newUser.username;
    user.email = newUser.email;
    user.password = newUser.password;
    user.settings.emailNotifications = newUser.settings.emailNotifications;
    user.settings.gameTheme = newUser.settings.gameTheme;
    this_.saveDatabase(function() {
      callback(userId);
    });
  });
}

JSONFileDatabase.prototype.register = function(newUser, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    for(var i = 0; i < database.users.length; ++i) {
      var user = database.users[i];
      if(user.username == newUser.username) {
        callback(null);
        return;
      }
    }
    
    var user = new entities.User(database.userIdCounter, newUser.username, newUser.password, newUser.email, newUser.settings);
    database.userIdCounter += 1;
    database.users.push(user);
    
    this_.saveDatabase(function() {
      callback(user.userId);
    });
  });
}

// GAME ENTITY MANAGEMENT

JSONFileDatabase.prototype.unit = function(gameId, unitId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.unitAt = function(gameId, x, y, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.units = function(gameId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.myUnits = function(gameId, playerId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.createUnit = function(gameId, unit, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.updateUnit = function(gameId, unitId, unit, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.deleteUnit = function(gameId, unitId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.tile = function(gameId, tileId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.tileAt = function(gameId, x, y, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.tiles = function(gameId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.myTiles = function(gameId, playerId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.createTile = function(gameId, tile, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.updateTile = function(gameId, tileId, tile, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

// CHAT

JSONFileDatabase.prototype.createChatMessage = function(gameId, chatMessage, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.chatMessages = function(gameId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

// GAME EVENT TICKER

JSONFileDatabase.prototype.createTickerMessage = function(gameId, content, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.tickerMessages = function(gameId, count, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

// GAME STATISTICS

JSONFileDatabase.prototype.gameStatistics = function(gameId, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}

JSONFileDatabase.prototype.createTurnStatistics = function(gameId, turnStatistics, callback) {
  var this_ = this;
  this.loadDatabase(function(database) {
    
    this_.saveDatabase(function() {
      callback();
    });
  });
}
