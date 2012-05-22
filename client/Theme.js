define(["image_map"], function(imageMap) {
  var GUI_IMAGES_HEALTH = 0;
  var SPRITE_TERRAIN = 0;
  var SPRITE_UNIT = 1;
  var SPRITE_GUI = 2;

  function Theme(themeName) {
    this.themeName = themeName;
    this.settings = {
      playerColors: [
        {r: 127, g: 127, b: 127},
        {r: 214, g: 61, b: 56},
        {r: 56, g: 67, b: 214},
        {r: 217, g: 213, b: 43},
        {r: 99, g: 173, b: 208}
      ]
    }
  }

  Theme.prototype.load = function(callback) {
    var settings = this.settings;
    $.getJSON("/img/themes/" + this.themeName + "/settings.json", function(data) {
      function process(d, t) {
        for(k in d) {
          if(d.hasOwnProperty(k) && t.hasOwnProperty(k)){
            if(typeof(d[k]) == "object") {
              process(d[k], t[k]);
            } else if(typeof(d[k]) == typeof(t[k])) {
              t[k] = d[k];
            }
          }
        }
      }
      
      process(data, settings);
      callback();
    });
  }

  Theme.prototype.getSpriteSheetUrl = function() {
    return "/img/themes/" + this.themeName + "/sprite_sheet.png";
  }

  Theme.prototype.getUnitCoordinates = function(unitType, unitOwner) {
    return SPRITE_SHEET_MAP[SPRITE_UNIT][unitType][unitOwner];
  }

  Theme.prototype.getTileCoordinates = function(tileType, tileSubtype, tileOwner) {
    return SPRITE_SHEET_MAP[SPRITE_TERRAIN][tileType][tileSubtype][tileOwner];
  }

  Theme.prototype.getHealthNumberCoordinates = function(healthNumber) {
    return SPRITE_SHEET_MAP[SPRITE_GUI][GUI_IMAGES_HEALTH][healthNumber];
  }

  Theme.prototype.getPlayerColor = function(playerNumber) {
    if(playerNumber < this.settings.playerColors.length) {
      return this.settings.playerColors[playerNumber];
    } else {
      return this.settings.playerColors[0];
    }
  }

  Theme.prototype.getPlayerColorString = function(playerNumber) {
    var c = this.getPlayerColor(playerNumber);
    return "rgb(" + c.r + "," + c.g + "," + c.b + ")";
  }

  Theme.prototype.getNumberOfUnitTypes = function() {
    return SPRITE_SHEET_MAP[SPRITE_UNIT].length;
  }

  Theme.prototype.getNumberOfUnitOwners = function(unitType) {
    return SPRITE_SHEET_MAP[SPRITE_UNIT][unitType].length;
  }

  Theme.prototype.getNumberOfTileTypes = function() {
    return SPRITE_SHEET_MAP[SPRITE_TERRAIN].length;
  }

  Theme.prototype.getNumberOfTileSubtypes = function(tileType) {
    return SPRITE_SHEET_MAP[SPRITE_TERRAIN][tileType].length;
  }

  Theme.prototype.getNumberOfTileOwners = function(tileType, tileSubtype) {
    return SPRITE_SHEET_MAP[SPRITE_TERRAIN][tileType][tileSubtype].length;
  }

  Theme.prototype.getAttackIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_attack.png";
  }

  Theme.prototype.getDeployIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_deploy.png";
  }

  Theme.prototype.getUndeployIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_undeploy.png";
  }

  Theme.prototype.getCaptureIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_capture.png";
  }

  Theme.prototype.getWaitIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_wait.png";
  }

  Theme.prototype.getLoadIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_load.png";
  }

  Theme.prototype.getUnloadIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_unload.png";
  }

  Theme.prototype.getCancelIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_cancel.png";
  }

  Theme.prototype.getEraserIconUrl = function() {
    return "/img/themes/" + this.themeName + "/nothing.png";
  }
  
  return Theme;
});