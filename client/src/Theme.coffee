define ->
  class Theme
    constructor: (@themeName) ->
      @settings = {}
  Theme::load = (callback) ->
    that = this
    $.getJSON "/img/themes/" + @themeName + "/settings.json", (data) ->
      that.settings = data
      sheet = that.settings.sheet
      image = that.settings.image
      sheetLayout = that.settings.sheetLayout
      coords = {}
      i = 0

      while i < sheetLayout.length
        name = sheetLayout[i]
        if name isnt null
          coords[name] =
            x: Math.floor(i % sheet.cols) * image.width
            y: Math.floor(i / sheet.cols) * image.height
        ++i
      that.settings.sprites = coords
      callback()


  Theme::getSpriteSheetUrl = ->
    "/img/themes/" + @themeName + "/" + @settings.sheet.filename

  Theme::getCoordinates = (name) ->
    return null  if name is null or name is `undefined`
    @settings.sprites[name]

  Theme::getTileCoordinates = (tileType, tileSubtype, tileOwner) ->
    @getCoordinates @settings.tiles[tileType][tileSubtype][tileOwner].hex

  Theme::getTilePropCoordinates = (tileType, tileSubtype, tileOwner) ->
    @getCoordinates @settings.tiles[tileType][tileSubtype][tileOwner].prop

  Theme::getTileOffset = (tileType, tileSubtype, tileOwner) ->
    @settings.tiles[tileType][tileSubtype][tileOwner].offset

  Theme::getUnitCoordinates = (unitType, unitOwner) ->
    @getCoordinates @settings.units[unitType][unitOwner]

  Theme::getHealthNumberCoordinates = (healthNumber) ->
    @getCoordinates @settings.numbers.health[healthNumber]

  Theme::getDamageNumberCoordinates = (damageNumber) ->
    @getCoordinates @settings.numbers.damage[damageNumber]

  Theme::getDeployEmblemCoordinates = ->
    @getCoordinates @settings.emblems.deploy

  Theme::getPlayerColor = (playerNumber) ->
    if playerNumber < @settings.playerColors.length
      @settings.playerColors[playerNumber]
    else
      @settings.playerColors[0]

  Theme::getPlayerColorString = (playerNumber) ->
    c = @getPlayerColor(playerNumber)
    "rgb(" + c.r + "," + c.g + "," + c.b + ")"

  Theme::getNumberOfUnitTypes = ->
    @settings.units.length

  Theme::getNumberOfUnitOwners = (unitType) ->
    @settings.units[unitType].length

  Theme::getNumberOfTileTypes = ->
    @settings.tiles.length

  Theme::getNumberOfTileSubtypes = (tileType) ->
    @settings.tiles[tileType].length

  Theme::getNumberOfTileOwners = (tileType, tileSubtype) ->
    @settings.tiles[tileType][tileSubtype].length

  Theme::getAttackIconUrl = ->
    "/img/themes/" + @themeName + "/gui/action_attack.png"

  Theme::getDeployIconUrl = ->
    "/img/themes/" + @themeName + "/gui/action_deploy.png"

  Theme::getUndeployIconUrl = ->
    "/img/themes/" + @themeName + "/gui/action_undeploy.png"

  Theme::getCaptureIconUrl = ->
    "/img/themes/" + @themeName + "/gui/action_capture.png"

  Theme::getWaitIconUrl = ->
    "/img/themes/" + @themeName + "/gui/action_wait.png"

  Theme::getLoadIconUrl = ->
    "/img/themes/" + @themeName + "/gui/action_load.png"

  Theme::getUnloadIconUrl = ->
    "/img/themes/" + @themeName + "/gui/action_unload.png"

  Theme::getCancelIconUrl = ->
    "/img/themes/" + @themeName + "/gui/action_cancel.png"

  Theme::getEraserIconUrl = ->
    "/img/themes/" + @themeName + "/nothing.png"

  Theme

