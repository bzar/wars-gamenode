define ->
  class Theme
    constructor: (@themeName) ->
      @settings = {}
      
    load: (callback) ->
      that = this
      $.getJSON "/img/themes/#{@themeName}/settings.json", (data) ->
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


    getSpriteSheetUrl: -> "/img/themes/#{@themeName}/" + @settings.sheet.filename
    getCoordinates: (name) -> if name? then @settings.sprites[name] else null
    getTileCoordinates: (tileType, tileSubtype, tileOwner) -> @getCoordinates @settings.tiles[tileType][tileSubtype][tileOwner].hex
    getTilePropCoordinates: (tileType, tileSubtype, tileOwner) -> @getCoordinates @settings.tiles[tileType][tileSubtype][tileOwner].prop
    getTileOffset: (tileType, tileSubtype, tileOwner) -> @settings.tiles[tileType][tileSubtype][tileOwner].offset
    getUnitCoordinates: (unitType, unitOwner) -> @getCoordinates @settings.units[unitType][unitOwner]
    getHealthNumberCoordinates: (healthNumber) -> @getCoordinates @settings.numbers.health[healthNumber]
    getDamageNumberCoordinates: (damageNumber) -> @getCoordinates @settings.numbers.damage[damageNumber]
    getDeployEmblemCoordinates: -> @getCoordinates @settings.emblems.deploy

    getPlayerColor: (playerNumber) ->
      if playerNumber < @settings.playerColors.length
        @settings.playerColors[playerNumber]
      else
        @settings.playerColors[0]

    getPlayerColorString: (playerNumber) ->
      c = @getPlayerColor(playerNumber)
      "rgb(#{c.r},#{c.g},#{c.b})"

    getNumberOfUnitTypes: -> @settings.units.length
    getNumberOfUnitOwners: (unitType) -> @settings.units[unitType].length
    getNumberOfTileTypes: -> @settings.tiles.length
    getNumberOfTileSubtypes: (tileType) -> @settings.tiles[tileType].length
    getNumberOfTileOwners: (tileType, tileSubtype) -> @settings.tiles[tileType][tileSubtype].length
    getAttackIconUrl: -> "/img/themes/#{@themeName}/gui/action_attack.png"
    getDeployIconUrl: -> "/img/themes/#{@themeName}/gui/action_deploy.png"
    getUndeployIconUrl: -> "/img/themes/#{@themeName}/gui/action_undeploy.png"
    getCaptureIconUrl: -> "/img/themes/#{@themeName}/gui/action_capture.png"
    getWaitIconUrl: -> "/img/themes/#{@themeName}/gui/action_wait.png"
    getLoadIconUrl: -> "/img/themes/#{@themeName}/gui/action_load.png"
    getUnloadIconUrl: -> "/img/themes/#{@themeName}/gui/action_unload.png"
    getCancelIconUrl: -> "/img/themes/#{@themeName}/gui/action_cancel.png"
    getEraserIconUrl: -> "/img/themes/#{@themeName}/nothing.png"

  return Theme

