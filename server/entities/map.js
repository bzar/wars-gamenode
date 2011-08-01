function Map(mapId, authorId, name, funds, mapData) {
  this.mapId = mapId;
  this.authorId = authorId;
  this.name = name;
  this.funds = funds;
  this.players = null;
  
  if(mapData !== undefined)
    this.parseInfo(mapData);
};

exports.Map = Map;

Map.prototype.clone = function() {
  var m = new Map();
  m.mapId = this.mapId;
  m.authorId = this.authorId;
  m.name = this.name;
  m.funds = this.funds;
  m.players = this.players;
  return m;
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
    if(tile.unit != null) {
      addPlayer(tile.unit.owner);
    }
  }
  
  this.players = players.length;
}