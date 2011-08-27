function Game(gameId, authorId, name, mapId, state, turnStart, turnNumber, roundNumber, inTurnNumber, settings) {
  this.gameId = gameId;
  this.authorId = authorId;
  this.name = name;
  this.mapId = mapId;
  this.state = state;
  this.turnStart = turnStart;
  this.turnNumber = turnNumber;
  this.roundNumber = roundNumber;
  this.inTurnNumber = inTurnNumber;
  this.settings = {
    public: settings.public,
    turnLength: settings.turnLength
  }
};

exports.Game = Game;

Game.prototype.clone = function() {
  var g = new Game(this.gameId, this.authorId, this.name, this.mapId, this.state, this.turnStart, 
                   this.turnNumber, this.roundNumber, this.inTurnNumber, 
                   {public: this.settings.public, turnLength: this.settings.turnLength});
  return g;
}

Game.prototype.cloneFrom = function(other) {
  this.gameId = other.gameId;
  this.authorId = other.authorId;
  this.name = other.name;
  this.mapId = other.mapId;
  this.state = other.state;
  this.turnStart = other.turnStart;
  this.turnNumber = other.turnNumber;
  this.roundNumber = other.roundNumber;
  this.inTurnNumber = other.inTurnNumber;
  this.settings = {
    public: other.settings.public,
    turnLength: other.settings.turnLength
  }
  return this;
}

Game.prototype.changeTurn = function(nextInTurn) {
  if(nextInTurn < this.inTurnNumber || this.roundNumber == 0) {
    this.roundNumber += 1;
  }
  this.turnNumber += 1;
  this.inTurnNumber = nextInTurn;
}

Game.prototype.playerInTurn = function() {
  var inTurn = null;
  if(this.players !== undefined && this.inTurnNumber != 0) {
    for(var i = 0; i < this.players.length; ++i) {
      var player = this.players[i];
      if(player.playerNumber == this.inTurnNumber) {
        inTurn = player;
        break;
      }
    }
  }
  return inTurn;
}

Game.prototype.getTile = function(x, y) {
  var tile = null;
  if(this.tiles !== undefined) {
    for(var i = 0; i < this.tiles.length; ++i) {
      var t = this.tiles[i];
      if(t.x == x && t.y == y) {
        tile = t;
        break;
      }
    }
  }
  return t;
}

Game.prototype.getMapSize = function() {
  if(this.tiles === undefined)
    return null;
  
  var maxX = 0;
  var maxY = 0;
  
  for(var i = 0; i < this.tiles.length; ++i) {
    var tile = this.tiles[i];
    maxX = tile.x > maxX ? tile.x : maxX;
    maxY = tile.y > maxY ? tile.y : maxY;
  }
  return {w: maxX+1, h: maxY+1};
}

Game.prototype.getMapArray = function() {
    if(this.tiles === undefined)
      return null;
  
    var mapArray = [];
    for(var i = 0; i < this.tiles.length; ++i) {
      var tile = this.tiles[i];
      if(tile.y >= mapArray.length) {
        var difference = tile.y - mapArray.length + 1;
        for(var j = 0; j < difference; ++j) {
          mapArray.push([]);
        }
      }
      if(tile.x >= mapArray[tile.y].length) {
          mapArray[tile.y].length = tile.x + 1;
      }

      mapArray[tile.y][tile.x] = tile;
    }

    return mapArray;
}

