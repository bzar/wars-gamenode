function Map(mapId, authorId, name, funds, mapData) {
  this.mapId = mapId;
  this.authorId = authorId;
  this.name = name;
  this.funds = funds;
  this.players = null;
  this.mapData = mapData;

  if(mapData !== undefined)
    this.parseInfo(mapData);
};

exports.Map = Map;

Map.prototype.clone = function() {
  var m = new Map(this.mapId, this.authorId, this.name, this.funds, this.mapData);
  return m;
}

Map.prototype.cloneFrom = function(other) {
  this.mapId = other.mapId;
  this.authorId = other.authorId;
  this.name = other.name;
  this.funds = other.funds;
  this.players = other.players;
  this.mapData = other.mapData;
  return this;
}

Map.prototype.parseInfo = function(mapData) {
  var players = [];

  function addPlayer(playerNumber) {
    for(var i = 0; i < players.length; ++i) {
      if(players[i] == playerNumber) {
        return;
      }
    }
    players.push(playerNumber);
  }

  for(var i = 0; i < mapData.length; ++i) {
    var tile = mapData[i];
    if(tile.owner != 0) {
      addPlayer(tile.owner);
    }
    if(tile.unit !== null && tile.unit.owner !== 0) {
      addPlayer(tile.unit.owner);
    }
  }

  this.players = players.length;
}