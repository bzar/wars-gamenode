var entities = require("../../entities");
var settings = require("../../settings").settings;
var utils = require("../../utils");

var DummyDatabase = require("./dummy").implementation;

var mongo = require("../../lib/node-mongodb-native/lib/mongodb");

var MongoDBDatabase = function(params) {
  this.host = params.host ? params.host : "localhost";
  this.port = params.port ? params.port : mongo.Connection.DEFAULT_PORT;
  this.databaseName = params.database;
  this.client = new mongo.Db(this.databaseName, new mongo.Server(this.host, this.port, {}));

  var this_ = this;
  this.client.open(function(err, db) {
    this_.database = db;
  });
}

MongoDBDatabase.prototype = new DummyDatabase();

exports.implementation = MongoDBDatabase;


MongoDBDatabase.prototype.toObjectID = function(id) {
  if(typeof(id) === "string") 
    return new this.client.bson_serializer.ObjectID(id);
  else
    return id;
}


// GAME MANAGEMENT

MongoDBDatabase.prototype.game = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.game");
  gameId = this.toObjectID(gameId);
  this.database.collection("games", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({_id: gameId}, function(err, game) {
      if(err) { callback({success: false, reason: err}); return; }
      if(game === null) { callback({success: false, reason: "Invalid gameId: " + gameId}); return; }
      var result = new entities.Game(game._id.toString(), game.authorId, game.name, game.mapId, game.state, 
                                     game.turnStart, game.turnNumber, game.roundNumber, game.inTurnNumber,
                                     {public: game.public, turnLength: game.turnLength});
      timer.end();
      callback({success: true, game: result});
    });
  });
}

MongoDBDatabase.prototype.createGame = function(game, gameData, players, callback) {
  var timer = new utils.Timer("MongoDBDatabase.createGame");
  var database = this.database;
  var this_ = this;
  
  database.collection("games", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var gameId = collection.pkFactory.createPk();
    var gameValues = {_id: gameId, authorId: this_.toObjectID(game.authorId), name: game.name, 
                      mapId: game.mapId, state: game.state, turnStart: game.turnStart, 
                      turnNumber: game.turnNumber, roundNumber: game.roundNumber, 
                      inTurnNumber: game.inTurnNumber, public: game.settings.public, 
                      turnLength: game.settings.turnLength};
    collection.insert(gameValues, function(err, game) {
      if(err) { callback({success: false, reason: err}); return; }
      database.collection("players", function(err, collection) {
        var playerValues = [];
        for(var i = 0; i < players.length; ++i) {
          var playerObj = players[i];
          var userId = this_.toObjectID(playerObj.userId);
          var player = {gameId: gameId, userId: null, playerNumber: playerObj.playerNumber,
                        playerName: playerObj.playerName, funds: playerObj.funds, score: playerObj.score, 
                        settings: playerObj.settings};
          playerValues.push(player);
        }
        
        collection.insertAll(playerValues, function(err, players) {
          if(err) { callback({success: false, reason: err}); return; }
          
          database.collection("tiles", function(err, tileCollection) {
            if(err) { callback({success: false, reason: err}); return; }
            for(var i = 0; i < gameData.length; ++i) {
              var tileObj = gameData[i];
              tileObj.tileId = tileCollection.pkFactory.createPk();
              tileObj.unitId = null;
            }
            
            database.collection("units", function(err, unitCollection) {
              if(err) { callback({success: false, reason: err}); return; }
              
              var tiles = [];
              var units = [];
              
              for(var i = 0; i < gameData.length; ++i) {
                var tileObj = gameData[i];
                tileObj.tileId = tileCollection.pkFactory.createPk();
                if(tileObj.unit !== null) {
                  var unitObj = tileObj.unit;
                  unitObj.unitId = unitCollection.pkFactory.createPk();
                  tileObj.unitId = unitObj.unitId;
                  unitObj.tileId = tileObj.tileId;
                  var unit = {_id: unitObj.unitId, gameId: gameId, tileId: unitObj.tileId, 
                              type: unitObj.type, owner: unitObj.owner, carriedBy: unitObj.carriedBy, 
                              health: unitObj.health, deployed: unitObj.deployed, 
                              moved: unitObj.moved, capturing: unitObj.capturing}
                  units.push(unit);
                }
                
                var tile = {_id: tileObj.tileId, gameId: gameId, x: tileObj.x, y: tileObj.y, 
                            type: tileObj.type, subtype: tileObj.subtype, owner: tileObj.owner, 
                            unitId: tileObj.unitId, capturePoints: tileObj.capturePoints, 
                            beingCaptured: tileObj.beingCaptured}
                tiles.push(tile);
              }
              
              tileCollection.insertAll(tiles, function(err, tiles) {
                unitCollection.insertAll(units, function(err, units) {
                  if(err) { callback({success: false, reason: err}); return; }
                  timer.end();
                  callback({success: true, gameId: gameId});
                });
              });
            });
          });
        });
      });
    });
  });
}

MongoDBDatabase.prototype.updateGame = function(game, callback) {
  var timer = new utils.Timer("MongoDBDatabase.updateGame");
  var gameId = game.gameId;
  gameId = this.toObjectID(gameId);
  this.database.collection("games", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var values = {$set: {authorId: game.authorId, name: game.name, mapId: game.mapId, 
                  state: game.state, turnStart: game.turnStart, turnNumber: game.turnNumber, 
                  roundNumber: game.roundNumber, inTurnNumber: game.inTurnNumber, 
                  public: game.settings.public, turnLength: game.settings.turnLength} }
    collection.update({_id:gameId}, values, function(err) {
      if(err) { callback({success: false, reason: err}); return; }
      timer.end();
      callback({success: true});
    });
  });
}

MongoDBDatabase.prototype.deleteGame = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.deleteGame");
  var database = this.database;
  gameId = this.toObjectID(gameId);
  
  database.collection("games", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.remove({_id:gameId}, function(err) {
      if(err) { callback({success: false, reason: err}); return; }
      database.collection("tiles", function(err, collection) {
        collection.remove({gameId:gameId}, function(err) {
          database.collection("units", function(err, collection) {
            collection.remove({gameId:gameId}, function(err) {
              database.collection("players", function(err, collection) {
                collection.remove({gameId:gameId}, function(err) {
                  timer.end();
                  callback({success: true});
                });
              });
            });
          });
        });
      });
    });
  });
}

function fetchGamesByQuery(database, query, callback) {
  database.collection("games", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find(query, function(err, games) {
      if(err) { callback({success: false, reason: err}); return; }
      var result = [];
      games.each(function(err, game) {
        if(game !== null) {
          var gameObj = new entities.Game(game._id.toString(), game.authorId, game.name, game.mapId, game.state, 
                                          game.turnStart, game.turnNumber, game.roundNumber, game.inTurnNumber,
                                          {public: game.public, turnLength: game.turnLength});
          gameObj.numPlayers = 0;
          result.push(gameObj);
        } else {
          var gameIds = result.map(function(d) { return new database.bson_serializer.ObjectID(d.gameId); });
          var mapIds = result.map(function(d) { return new database.bson_serializer.ObjectID(d.mapId); });
          database.collection("players", function(err, collection) {
            collection.find({gameId: {$in: gameIds}, userId: {"$ne": null}}, function(err, players) {
              players.toArray(function(err, players) {
                result.forEach(function(game) {
                  game.numPlayers = players.filter(function(player){ 
                    return player.gameId == game.gameId;
                  }).length;
                });
                database.collection("maps", function(err, collection) {
                  collection.find({_id: {$in: mapIds}}, function(err, maps) {
                    maps.each(function(err, map) {
                      if(map !== null) {
                        result.filter(function(game) { return game.mapId == map._id }).forEach(function(game) {
                          game.map = new entities.Map(map._id.toString(), map.authorId, map.name, map.funds, map.mapData);
                          game.map.mapData = undefined;
                        });
                      } else {
                        callback({success: true, games: result});
                      }
                    });
                  });
                });
              });
            });
          });
        }
      });
    });
  });
}
MongoDBDatabase.prototype.openGames = function(callback) {
  var timer = new utils.Timer("MongoDBDatabase.openGames");
  fetchGamesByQuery(this.database, {state: "pregame", public: true}, function(result) {
    timer.end();
    callback(result);
  });
}

MongoDBDatabase.prototype.publicGames = function(callback) {
  var timer = new utils.Timer("MongoDBDatabase.openGames");
  fetchGamesByQuery(this.database, {state: "inProgress", public: true}, function(result) {
    timer.end();
    callback(result);
  });
}

MongoDBDatabase.prototype.myGames = function(userId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.myGames");
  var database = this.database;
  userId = this.toObjectID(userId);
  
  database.collection("players", function(err, collection) {
    collection.find({userId: userId}, function(err, players) {
      if(err) { callback({success: false, reason: err}); return; }
      var gameIds = [];
      var hiddenIds = [];
      players.each(function(err, player) {
        if(player !== null) {
          if(!player.settings.hidden) {
            gameIds.push(player.gameId);
          } else {
            hiddenIds.push(player.gameId);
          }
        } else {
          fetchGamesByQuery(database, {$or: [{_id: {$in: gameIds}}, {authorId: userId}], 
                                       _id: {$nin: hiddenIds}}, function(result) {
            timer.end();
            callback(result);
          });
        }
      });
    });
  });
}

MongoDBDatabase.prototype.players = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.players");
  gameId = this.toObjectID(gameId);

  this.database.collection("players", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId}, function(err, cursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var result = [];
      cursor.each(function(err, player) {
        if(player !== null) {
          var playerObj = new entities.Player(player._id.toString(), player.gameId, player.userId, 
                                              player.playerNumber, player.playerName, player.funds, 
                                              player.score, player.settings);
          result.push(playerObj);
        } else {
          timer.end();
          callback({success: true, players: result});
        }
      });
    });
  });
}

MongoDBDatabase.prototype.playersWithUsers = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.playersWithUsers");
  var database = this.database;
  gameId = this.toObjectID(gameId);

  database.collection("players", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId}, function(err, cursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var result = [];
      cursor.each(function(err, player) {
        if(player !== null) {
          var playerObj = new entities.Player(player._id.toString(), player.gameId, player.userId, 
                                              player.playerNumber, player.playerName, player.funds, 
                                              player.score, player.settings);
          result.push(player);
        } else {
          var userIds = result.map(function(d){ return d.userId });
          database.collection("users", function(err, collection) {
            collection.find({_id: {$in: userIds}}, function(err, users) {
              users.each(function(err, user) {
                if(user !== null) {
                  result.filter(function(d){ return d.userId == user._id; }).forEach(function(player) {
                    player.user =  new entities.User(user._id.toString(), user.username, user.password, 
                                                     user.email, user.settings);
                  });
                } else {
                  timer.end();
                  callback({success: true, players: result});                  
                }
              });
            });
          });
        }
      });
    });
  });
}

MongoDBDatabase.prototype.gamePlayer = function(gameId, playerNumber, callback) {
  var timer = new utils.Timer("MongoDBDatabase.gamePlayer");
  gameId = this.toObjectID(gameId);

  this.database.collection("players", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({gameId: gameId, playerNumber: playerNumber}, function(err, player) {
      if(err) { callback({success: false, reason: err}); return; }
      if(player === null) { callback({success: false, reason: "Player not found!"}); return; }
      
      var playerObj = new entities.Player(player._id.toString(), player.gameId, player.userId, 
                                          player.playerNumber, player.playerName, player.funds, 
                                          player.score, player.settings);
      timer.end();
      callback({success: true, player: playerObj});
    });
  });
}

MongoDBDatabase.prototype.userPlayerInTurn = function(gameId, userId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.userPlayerInTurn");
  var database = this.database;
  gameId = this.toObjectID(gameId);
  userId = this.toObjectID(userId);

  database.collection("games", function(err, collection) {
    collection.findOne({_id: gameId}, function(err, game) {
      if(game === null)  { callback({success: false, reason: "Game not found!"}); return; }
      
      database.collection("players", function(err, collection) {
        if(err) { callback({success: false, reason: err}); return; }
        collection.findOne({gameId: gameId, userId: userId, 
                           playerNumber: game.inTurnNumber}, function(err, player) {
          if(err) { callback({success: false, reason: err}); return; }
          if(player === null) { callback({success: false, reason: "Player not found!"}); return; }
          var playerObj = new entities.Player(player._id.toString(), player.gameId, player.userId, 
                                              player.playerNumber, player.playerName, player.funds, 
                                              player.score, player.settings);
          timer.end();
          callback({success: true, player: playerObj});
        });
      });
    });
  });
}

MongoDBDatabase.prototype.player = function(playerId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.player");
  playerId = this.toObjectID(playerId);

  this.database.collection("players", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({_id: playerId}, function(err, player) {
      if(err) { callback({success: false, reason: err}); return; }
      if(player === null) { callback({success: false, reason: "Player not found!"}); return; }
      
      var playerObj = new entities.Player(player._id.toString(), player.gameId, player.userId, 
                                          player.playerNumber, player.playerName, player.funds, 
                                          player.score, player.settings);
      timer.end();
      callback({success: true, player: playerObj});
    });
  });
}

MongoDBDatabase.prototype.updatePlayer = function(player, callback) {
  this.updatePlayers([player], callback);
}

MongoDBDatabase.prototype.updatePlayers = function(players, callback) {
  var timer = new utils.Timer("MongoDBDatabase.updatePlayers");
  var database = this.database;
  var this_ = this;
  database.collection("players", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    players.forEach(function(playerObj) {
      var playerId = this_.toObjectID(playerObj.playerId);
      var gameId = this_.toObjectID(playerObj.gameId);
      var userId = this_.toObjectID(playerObj.userId);
      var player = {$set: {gameId: gameId, userId: userId, playerNumber: playerObj.playerNumber,
                    playerName: playerObj.playerName, funds: playerObj.funds, score: playerObj.score, 
                    settings: playerObj.settings} };
      collection.update({_id: playerId}, player);
    });
    timer.end();
    callback({success: true});
  });
}

// MAP MANAGEMENT

MongoDBDatabase.prototype.createMap = function(newMap, callback) {
  var this_ = this;
  var timer = new utils.Timer("MongoDBDatabase.createMap");
  var authorId = this.toObjectID(newMap.authorId);
  this.database.collection("maps", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var map = {authorId: authorId, name: newMap.name, funds: newMap.funds, mapData: newMap.mapData};
    collection.insert(map, function(err, docs) {
      if(err) { callback({success: false, reason: err}); return; }
      timer.end();
      callback({success: true, mapId: docs[0]._id});
    });
  });
}

MongoDBDatabase.prototype.updateMap = function(map, callback) {
  var timer = new utils.Timer("MongoDBDatabase.updateMap");
  var mapId = map.mapId;
  var this_ = this;
  var mapId = this.toObjectID(map.mapId);
  var authorId = this.toObjectID(map.authorId);
  this.database.collection("maps", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var values = {$set: {authorId: authorId, name: map.name, funds: map.funds, mapData: map.mapData} };
    collection.update({_id:mapId}, values, function(err) {
      if(err) { callback({success: false, reason: err}); return; }
      timer.end();
      callback({success: true});
    });
  });
}

MongoDBDatabase.prototype.map = function(mapId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.map");
  mapId = this.toObjectID(mapId);
  this.database.collection("maps", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({_id: mapId}, function(err, map) {
      if(err) { callback({success: false, reason: err}); return; }
      if(map === null) { callback({success: false, reason: "Invalid mapId: " + mapId}); return; }
      var result = new entities.Map(map._id.toString(), map.authorId, map.name, map.funds, map.mapData);
      result.mapData = undefined;
      timer.end();
      callback({success: true, map: result});
    });
  });
}

MongoDBDatabase.prototype.mapData = function(mapId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.mapData");
  mapId = this.toObjectID(mapId);
  this.database.collection("maps", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({_id: mapId}, function(err, map) {
      if(err) { callback({success: false, reason: err}); return; }
      if(map === null) { callback({success: false, reason: "Invalid mapId: " + mapId}); return; }
      timer.end();
      callback({success: true, mapData: map.mapData});
    });
  });
}

MongoDBDatabase.prototype.maps = function(callback) {
  var timer = new utils.Timer("MongoDBDatabase.maps");
  this.database.collection("maps", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find(function(err, cursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var maps = [];
      cursor.each(function(err, map) {
        if(map !== null) {
          var mapObj = new entities.Map(map._id.toString(), map.authorId, map.name, map.funds, map.mapData);
          mapObj.mapData = undefined;
          maps.push(mapObj);
        } else {
          timer.end();
          callback({success: true, maps: maps});
        }
      });
    });
  });
}

MongoDBDatabase.prototype.myMaps = function(userId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.myMaps");
  userId = this.toObjectID(userId);
  this.database.collection("maps", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({authorId: userId}, function(err, cursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var maps = [];
      cursor.each(function(err, map) {
        if(map !== null) {
          var mapObj = new entities.Map(map._id.toString(), map.authorId, map.name, map.funds, map.mapData);
          mapObj.mapData = undefined;
          maps.push(mapObj);
        } else {
          timer.end();
          callback({success: true, maps: maps});
        }
      });
    });
  });
}

// USER MANAGEMENT

MongoDBDatabase.prototype.userByName = function(username, callback) {
  var timer = new utils.Timer("MongoDBDatabase.userId");
  this.database.collection("users", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({username:username}, function(err, user) {
      if(err) { callback({success: false, reason: err}); return; }
      if(user !== null) {
        var result = new entities.User(user._id.toString(), user.username, user.password, 
                                     user.email, user.settings);
        timer.end();
        callback({success: true, user: result});
      }
    });
  });
}

MongoDBDatabase.prototype.user = function(userId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.user");
  userId = this.toObjectID(userId);
  this.database.collection("users", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({_id: userId}, function(err, user) {
      if(err) { callback({success: false, reason: err}); return; }
      if(user === null) { callback({success: false, reason: "No such user!"}); return; }
      var result = new entities.User(user._id.toString(), user.username, user.password, 
                                     user.email, user.settings);
      timer.end();
      callback({success: true, user: result});
    });
  });
}

MongoDBDatabase.prototype.updateUser = function(user, callback) {
  var timer = new utils.Timer("MongoDBDatabase.updateUser");
  userId = this.toObjectID(user.userId);
  this.database.collection("users", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var values = {$set: {username: user.username, password: user.password, 
                  email: user.email, settings: user.settings} };
    collection.update({_id:userId}, values, function(err) {
      if(err) { callback({success: false, reason: err}); return; }
      timer.end();
      callback({success: true});
    });
  });
}

MongoDBDatabase.prototype.register = function(newUser, callback) {
  var timer = new utils.Timer("MongoDBDatabase.register");
  this.database.collection("users", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var user = {username: newUser.username, password: newUser.password, 
                email: newUser.email, settings: newUser.settings};
    collection.insert(user, function(err, docs) {
      if(err) { callback({success: false, reason: err}); return; }
      var result = newUser.clone();
      result.userId = docs._id;
      timer.end();
      callback({success: true, user: result});
    });
  });
}

// GAME ENTITY MANAGEMENT

function getCarriedUnits(unit, carriers) {
  unit.carriedUnits = [];
  if(unit.unitId in carriers) {
    carriers[unit.unitId].forEach(function(carried) {
      unit.carriedUnits.push(getCarriedUnits(carried, carriers));
    });
  }
  return unit;
}

MongoDBDatabase.prototype.unit = function(unitId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.unit");
  unitId = this.toObjectID(unitId);
  var this_ = this;
  this.database.collection("units", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({_id: unitId}, function(err, unit) {
      if(err) { callback({success: false, reason: err}); return; }
      if(unit === null) { callback({success: false, reason: "No such unit!"}); return; }
      var gameId = this_.toObjectID(unit.gameId);
      unit = new entities.Unit(unit._id.toString(), unit.tileId, unit.type, unit.owner,
                               unit.carriedBy, unit.health, unit.deployed, unit.moved, 
                               unit.capturing);
      unit.tileId = unit.tileId === null ? null : unit.tileId.toString();
      unit.carriedBy = unit.carriedBy === null ? null : unit.carriedBy.toString();
      
      if(unit.unitType().carryNum == 0) {
        timer.end();
        callback({success: true, unit: unit});
      } else {
        var carrier = unit;
        collection.find({gameId: gameId, carriedBy: {$ne: null}}, function(err, carriedUnits) {
          var carriers = {};
          carriedUnits.each(function(err, unit) {
            if(unit !== null) {
              unit = new entities.Unit(unit._id.toString(), unit.tileId, unit.type, unit.owner,
                                      unit.carriedBy, unit.health, unit.deployed, unit.moved, 
                                      unit.capturing);
              unit.tileId = unit.tileId === null ? null : unit.tileId.toString();
              unit.carriedBy = unit.carriedBy === null ? null : unit.carriedBy.toString();
              
              if(carriers[unit.carriedBy] === undefined) carriers[unit.carriedBy] = [];
              carriers[unit.carriedBy].push(unit);
            } else {
              getCarriedUnits(carrier, carriers);
              timer.end();
              callback({success: true, unit: carrier});
            }
          });
        });
      }
    });
  });
}

MongoDBDatabase.prototype.unitAt = function(gameId, x, y, callback) {
  var timer = new utils.Timer("MongoDBDatabase.unitAt");
  var this_ = this;
  this.tileAt(gameId, x, y, function(result) {
    if(!result.success) { callback(result); return; }
    var tile = result.tile;
    if(tile.unitId === null) { 
      timer.end();
      callback({success: true, unit: null}); 
    } else {
      this_.unit(tile.unitId, function(result) {
        if(!result.success) { callback(result); return; }
        timer.end();
        callback({success: true, unit: result.unit});
      });
    }
  });
}

MongoDBDatabase.prototype.units = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.units");
  gameId = this.toObjectID(gameId);
  this.database.collection("units", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId}, function(err, unitCursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var units = [];
      var carriers = {};
      unitCursor.each(function(err, unit) {
        if(unit !== null) {
          unit = new entities.Unit(unit._id.toString(), unit.tileId, unit.type, unit.owner,
                               unit.carriedBy, unit.health, unit.deployed, unit.moved, 
                               unit.capturing);
          unit.tileId = unit.tileId === null ? null : unit.tileId.toString();
          unit.carriedBy = unit.carriedBy === null ? null : unit.carriedBy.toString();
          if(unit.carriedBy !== null) {
            if(carriers[unit.carriedBy] === undefined) carriers[unit.carriedBy] = [];
            carriers[unit.carriedBy].push(unit);
          }
          units.push(unit);
        } else {
          units.forEach(function(unit) {
            getCarriedUnits(unit, carriers);
          });
          timer.end();
          callback({success: true, units: units});          
        }
      });
    });
  });
}

MongoDBDatabase.prototype.playerUnits = function(gameId, playerNumber, callback) {
  var timer = new utils.Timer("MongoDBDatabase.playerUnits");
  gameId = this.toObjectID(gameId);
  this.database.collection("units", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId, owner: playerNumber}, function(err, unitCursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var units = [];
      var carriers = {};
      unitCursor.each(function(err, unit) {
        if(unit !== null) {
          unit = new entities.Unit(unit._id.toString(), unit.tileId, unit.type, unit.owner,
                               unit.carriedBy, unit.health, unit.deployed, unit.moved, 
                               unit.capturing);
          unit.tileId = unit.tileId === null ? null : unit.tileId.toString();
          unit.carriedBy = unit.carriedBy === null ? null : unit.carriedBy.toString();
          if(unit.carriedBy !== null) {
            if(carriers[unit.carriedBy] === undefined) carriers[unit.carriedBy] = [];
            carriers[unit.carriedBy].push(unit);
          }
          units.push(unit);
        } else {
          units.forEach(function(unit) {
            getCarriedUnits(unit, carriers);
          });
          timer.end();
          callback({success: true, units: units});          
        }
      });
    });
  });
}

MongoDBDatabase.prototype.createUnit = function(gameId, newUnit, callback) {
  var timer = new utils.Timer("MongoDBDatabase.createUnit");
  var database = this.database;
  var this_ = this;
  database.collection("units", function(err, collection) {
    gameId = this_.toObjectID(gameId);
    var tileId = this_.toObjectID(newUnit.tileId);
    var carriedBy = this_.toObjectID(newUnit.carriedBy);
    var unit = {gameId: gameId, tileId: tileId, 
                type: newUnit.type, owner: newUnit.owner, carriedBy: carriedBy, 
                health: newUnit.health, deployed: newUnit.deployed, 
                moved: newUnit.moved, capturing: newUnit.capturing};
    collection.insert(unit, function(err, savedUnits) {
      if(err) { callback({success: false, reason: err}); return; }
      timer.end();
      callback({success: true, unitId: savedUnits[0]._id.toString()});
    });
  });
}

MongoDBDatabase.prototype.updateUnit = function(unit, callback) {
  this.updateUnits([unit], callback);
}

MongoDBDatabase.prototype.updateUnits = function(units, callback) {
  var timer = new utils.Timer("MongoDBDatabase.updateUnits");
  var database = this.database;
  var this_ = this;
  database.collection("units", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    units.forEach(function(unitObj) {
      var unitId = this_.toObjectID(unitObj.unitId);
      var tileId = this_.toObjectID(unitObj.tileId);
      var carriedBy = this_.toObjectID(unitObj.carriedBy);
      var unit = {$set: {tileId: tileId, carriedBy: carriedBy, 
                  health: unitObj.health, deployed: unitObj.deployed, 
                  moved: unitObj.moved, capturing: unitObj.capturing} };
      collection.update({_id: unitId}, unit);
    });
    timer.end();
    callback({success: true});
  });
}

MongoDBDatabase.prototype.deleteUnit = function(unit, callback) {
  var timer = new utils.Timer("MongoDBDatabase.deleteUnit");
  var this_ = this;
  var unitId = this.toObjectID(unit.unitId);
  this.database.collection("units", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.remove({_id:unitId}, function(err) {
      if(err) { callback({success: false, reason: err}); return; }
      this_.database.collection("tiles", function(err, collection) {
        collection.update({unitId:unitId}, {$set: {unitId: null}}, function(err) {
          if(err) { callback({success: false, reason: err}); return; }
          timer.end();
          callback({success: true});
        });
      });
    });
  });
}

MongoDBDatabase.prototype.deleteUnits = function(units, callback) {
  var timer = new utils.Timer("MongoDBDatabase.deleteUnits");
  var this_ = this;
  var unitIds = units.map(function(d){ return this_.toObjectID(d.unitId); });
  this.database.collection("units", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.remove({_id:{$in: unitIds}}, function(err) {
      if(err) { callback({success: false, reason: err}); return; }
      this_.database.collection("tiles", function(err, collection) {
        collection.update({unitId:{$in: unitIds}}, {$set: {unitId: null}}, {multi: true}, function(err) {
          if(err) { callback({success: false, reason: err}); return; }
          timer.end();
          callback({success: true});
        });
      });
    });
  });
}

MongoDBDatabase.prototype.tile = function(tileId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.tile");
  tileId = this.toObjectID(tileId);
  this.database.collection("tiles", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({_id: tileId}, function(err, tile) {
      if(err) { callback({success: false, reason: err}); return; }
      if(tile === null) { callback({success: false, reason: "No such tile!"}); return; }
      tile = new entities.Tile(tile._id.toString(), tile.gameId.toString(), tile.x, tile.y, 
                               tile.type, tile.subtype, tile.owner, tile.unitId,
                               tile.capturePoints, tile.beingCaptured)
      tile.unitId = tile.unitId === null ? null : tile.unitId.toString();
      timer.end();
      callback({success: true, tile: tile});
    });
  });
}

MongoDBDatabase.prototype.tileAt = function(gameId, x, y, callback) {
  var timer = new utils.Timer("MongoDBDatabase.tileAt");
  gameId = this.toObjectID(gameId);
  this.database.collection("tiles", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.findOne({gameId: gameId, x: x, y: y}, function(err, tile) {
      if(err) { callback({success: false, reason: err}); return; }
      if(tile === null) { callback({success: false, reason: "No such tile!"}); return; }
      tile = new entities.Tile(tile._id.toString(), tile.gameId.toString(), tile.x, tile.y, 
                               tile.type, tile.subtype, tile.owner, tile.unitId,
                               tile.capturePoints, tile.beingCaptured)
      tile.unitId = tile.unitId === null ? null : tile.unitId.toString();
      timer.end();
      callback({success: true, tile: tile});
    });
  });
}

MongoDBDatabase.prototype.tiles = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.tiles");
  gameId = this.toObjectID(gameId);
  var this_ = this;
  this.database.collection("tiles", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId}, function(err, tileCursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var tiles = [];
      tileCursor.each(function(err, tile) {
        if(tile !== null) {
          tile = new entities.Tile(tile._id.toString(), tile.gameId.toString(), tile.x, tile.y, 
                                  tile.type, tile.subtype, tile.owner, tile.unitId,
                                  tile.capturePoints, tile.beingCaptured)
          tile.unitId = tile.unitId === null ? null : tile.unitId.toString();
          tiles.push(tile);
        } else {
          timer.end();
          callback({success: true, tiles: tiles});
        }
      });
    });
  });
}

MongoDBDatabase.prototype.playerTiles = function(gameId, playerNumber, callback) {
  var timer = new utils.Timer("MongoDBDatabase.playerTiles");
  if(typeof(gameId) === "string") gameId = new this.client.bson_serializer.ObjectID(gameId);
  this.database.collection("tiles", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId, owner: playerNumber}, function(err, tileCursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var tiles = [];
      tileCursor.each(function(err, tile) {
        if(tile !== null) {
          tile = new entities.Tile(tile._id.toString(), tile.gameId.toString(), tile.x, tile.y, 
                                  tile.type, tile.subtype, tile.owner, tile.unitId,
                                  tile.capturePoints, tile.beingCaptured)
          tile.unitId = tile.unitId === null ? null : tile.unitId.toString();
          tiles.push(tile);
        } else {
          timer.end();
          callback({success: true, tiles: tiles});
        }
      });
    });
  });
}

MongoDBDatabase.prototype.updateTile = function(tile, callback) {
  this.updateTiles([tile], callback);
}

MongoDBDatabase.prototype.updateTiles = function(tiles, callback) {
  var timer = new utils.Timer("MongoDBDatabase.updateTiles");
  var database = this.database;
  var this_ = this;
  database.collection("tiles", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    tiles.forEach(function(tileObj) {
      var unitId = this_.toObjectID(tileObj.unitId);
      var gameId = this_.toObjectID(tileObj.gameId);
      var tileId = this_.toObjectID(tileObj.tileId);
      var tile = {$set: {gameId: gameId, x: tileObj.x, y: tileObj.y, 
                  type: tileObj.type, subtype: tileObj.subtype, owner: tileObj.owner, 
                  unitId: unitId, capturePoints: tileObj.capturePoints, 
                  beingCaptured: tileObj.beingCaptured} }
      collection.update({_id: tileId}, tile);
    });
    timer.end();
    callback({success: true});
  });
}

// CHAT

MongoDBDatabase.prototype.createChatMessage = function(newChatMessage, callback) {
  var timer = new utils.Timer("MongoDBDatabase.createChatMessage");
  var database = this.database;
  var this_ = this;
  database.collection("chatMessages", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var gameId = this_.toObjectID(newChatMessage.gameId);
    var userId = this_.toObjectID(newChatMessage.userId);
    var message = {gameId: gameId, userId: userId, time: newChatMessage.time, 
                   content: newChatMessage.content}
    collection.insert(message, function(err, savedMessages) {
      if(err) { callback({success: false, reason: err}); return; }
      timer.end();
      callback({success: true, chatMessageId: savedMessages[0]._id.toString()});
    });
  });
}

MongoDBDatabase.prototype.chatMessages = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.chatMessages");
  gameId = this.toObjectID(gameId);
  var this_ = this;
  this.database.collection("chatMessages", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId}, function(err, messageCursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var messages = [];
      messageCursor.each(function(err, message) {
        if(message !== null) {
          message = new entities.ChatMessage(message._id.toString(), message.gameId.toString(), 
                                             message.userId.toString(), message.time, message.content);
          messages.push(message);
        } else {
          timer.end();
          callback({success: true, chatMessages: messages});
        }
      });
    });
  });
}

// GAME EVENTS

MongoDBDatabase.prototype.createGameEvent = function(newGameEvent, callback) {
  this.createGameEvent([newGameEvent], callback);
}

MongoDBDatabase.prototype.createGameEvents = function(newGameEvents, callback) {
  var timer = new utils.Timer("MongoDBDatabase.createGameEvents");
  var database = this.database;
  var this_ = this;
  database.collection("gameEvents", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var events = [];
    newGameEvents.forEach(function(event) {
      var gameId = this_.toObjectID(event.gameId);
      event = {gameId: gameId, time: event.time, content: event.content}
      events.push(event);
    });
    collection.insertAll(events, function(err) {
      if(err) { callback({success: false, reason: err}); return; }
      timer.end();
      callback({success: true});
    });
  });
}

MongoDBDatabase.prototype.gameEvents = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.gameEvents");
  gameId = this.toObjectID(gameId);
  var this_ = this;
  this.database.collection("gameEvents", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId}, function(err, eventCursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var events = [];
      eventCursor.each(function(err, event) {
        if(event !== null) {
          event = new entities.GameEvent(event._id.toString(), event.gameId.toString(), 
                                         event.time, event.content);
          events.push(event);
        } else {
          timer.end();
          callback({success: true, gameEvents: events});
        }
      });
    });
  });
}

// GAME STATISTICS

MongoDBDatabase.prototype.createGameStatistic = function(newGameStatistic, callback) {
  this.createGameStatistics([newGameStatistic], callback);
}

MongoDBDatabase.prototype.createGameStatistics = function(newGameStatistics, callback) {
  var timer = new utils.Timer("MongoDBDatabase.createGameStatistics");
  var database = this.database;
  var this_ = this;
  database.collection("gameStatistics", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    var statistics = [];
    newGameStatistics.forEach(function(statistic) {
      var gameId = this_.toObjectID(statistic.gameId);
      statistic = {gameId: gameId, turnNumber: statistic.turnNumber, 
                   roundNumber: statistic.roundNumber, inTurnNumber: statistic.inTurnNumber, 
                   content: statistic.content}
      statistics.push(statistic);
    });
    collection.insertAll(statistics, function(err, statistics) {
      if(err) { callback({success: false, reason: err}); return; }
      timer.end();
      callback({success: true});
    });
  });
}

MongoDBDatabase.prototype.gameStatistics = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.gameStatistics");
  gameId = this.toObjectID(gameId);
  var this_ = this;
  this.database.collection("gameStatistics", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId}, function(err, statisticCursor) {
      if(err) { callback({success: false, reason: err}); return; }
      var statistics = [];
      statisticCursor.each(function(err, statistic) {
        if(statistic !== null) {
          statistic = new entities.GameStatistic(statistic._id.toString(), statistic.gameId.toString(), 
                                                 statistic.turnNumber, statistic.roundNumber,
                                                 statistic.inTurnNumber, statistic.content);
          statistics.push(statistic);
        } else {
          timer.end();
          callback({success: true, gameStatistics: statistics});
        }
      });
    });
  });
}

MongoDBDatabase.prototype.gameLatestStatistic = function(gameId, callback) {
  var timer = new utils.Timer("MongoDBDatabase.gameLatestStatistic");
  gameId = this.toObjectID(gameId);
  var this_ = this;
  this.database.collection("gameStatistics", function(err, collection) {
    if(err) { callback({success: false, reason: err}); return; }
    collection.find({gameId: gameId}, {sort: {turnNumber: -1}, limit: 1}, function(err, statistic) {
      if(err) { callback({success: false, reason: err}); return; }
      statistic.nextObject(function(err, statistic) {
        if(statistic === null) { timer.end(); callback({success: true, latestStatistic: null}); return; }
        
        statistic = new entities.GameStatistic(statistic._id.toString(), statistic.gameId.toString(), 
                                                statistic.turnNumber, statistic.roundNumber,
                                                statistic.inTurnNumber, statistic.content);
        timer.end();
        callback({success: true, latestStatistic: statistic});
      });
    });
  });
}
