require ["Theme", "gamenode", "base"], (Theme) ->
  client = new GameNodeClient(Skeleton)
  session = null
  theme = null
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      populateNavigation session
      client.stub.profile (response) ->
        theme = new Theme(response.profile.settings.gameTheme)
        theme.load ->
          client.stub.gameRules null, (rules) ->
            populateInfo rules

  populateInfo = (rules) ->
    populateArmorNames rules
    populateTerrainNames rules
    populateRangeNumbers rules
    populateUnits rules
    populateWeapons rules
    populateRanges rules
    populateDefenses rules
    populateMovement rules
  populateArmorNames = (rules) ->
    numArmors = 0
    forEachProperty rules.armors, (armor) ->
      numArmors += 1
      $(".armorNames").each ->
        item = $("<th></th>")
        item.text armor.name
        $(this).append item


    $(".numArmors").attr "colspan", numArmors
  populateTerrainNames = (rules) ->
    numTerrains = 0
    forEachProperty rules.terrains, (terrain) ->
      numTerrains += 1
      $(".terrainNames").each ->
        item = $("<th></th>")
        item.text terrain.name
        $(this).append item

      $(".terrainImages").each ->
        item = $("<td></td>")
        terrainTypeItem = $("<span></span>")
        terrainTypeItem.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
        terrainTypeItem.addClass "sprite"
        terrainTypeItem.css "width", theme.settings.image.width
        terrainTypeItem.css "height", theme.settings.image.height
        pos = theme.getTileCoordinates(terrain.id, 0, 0)
        terrainTypeItem.css "background-position", -pos.x + "px " + (-pos.y + (theme.settings.image.height - theme.settings.hex.height - theme.settings.hex.thickness)) + "px"
        terrainTypeItem.attr "type", terrain.id
        propPos = theme.getTilePropCoordinates(terrain.id, 0, 0)
        if propPos
          terrainProp = $("<span></span>")
          terrainProp.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
          terrainProp.css "width", theme.settings.image.width
          terrainProp.css "height", theme.settings.image.height - theme.settings.hex.thickness
          terrainProp.css "display", "block"
          terrainProp.css "background-position", -propPos.x + "px " + (-propPos.y - theme.settings.hex.thickness) + "px"
          terrainTypeItem.append terrainProp
        item.append terrainTypeItem
        $(this).append item


    $(".numTerrains").attr "colspan", numTerrains
  maxRange = (rules) ->
    result = 0
    forEachProperty rules.weapons, (weapon) ->
      forEachProperty weapon.rangeMap, (efficiency, range) ->
        result = range  if range > result


    result
  populateRangeNumbers = (rules) ->
    max = maxRange(rules)
    $(".rangeNumbers").each ->
      j = 1

      while j <= max
        item = $("<th></th>")
        item.text j
        $(this).append item
        ++j

    $(".numRanges").attr "colspan", max
  populateUnits = (rules) ->
    units = $("#units tbody")
    forEachProperty rules.units, (unit) ->
      item = $("<tr></tr>")
      image = $("<td></td>")
      name = $("<td></td>")
      className = $("<td></td>")
      price = $("<td></td>")
      armorName = $("<td></td>")
      primaryWeaponName = $("<td></td>")
      secondaryWeaponName = $("<td></td>")
      movement = $("<td></td>")
      movementTypeName = $("<td></td>")
      carry = $("<td></td>")
      flags = $("<td></td>")
      image = $("<td></td>")
      pos = theme.getUnitCoordinates(unit.id, 1)
      image.attr "type", unit.id
      image.attr "owner", 1
      image.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
      image.addClass "sprite"
      image.css "width", theme.settings.image.width
      image.css "height", theme.settings.image.width
      image.css "background-position", -pos.x + "px " + -pos.y + "px"
      name.text unit.name
      name.addClass "name"
      className.text rules.unitClasses[unit.unitClass].name
      price.text unit.price
      armorName.text rules.armors[unit.armor].name
      primaryWeaponName.text (if unit.primaryWeapon isnt null then rules.weapons[unit.primaryWeapon].name else "-")
      secondaryWeaponName.text (if unit.secondaryWeapon isnt null then rules.weapons[unit.secondaryWeapon].name else "-")
      movement.text unit.movement
      movementTypeName.text rules.movementTypes[unit.movementType].name
      carryClasses = unit.carryClasses.map((classId) ->
        rules.unitClasses[classId].name
      ).join(", ")
      carry.text (if unit.carryNum > 0 then unit.carryNum + "x " + carryClasses else "-")
      flags.text unit.flags.map((flagId) ->
        rules.unitFlags[flagId].name
      ).join(", ")
      item.append image
      item.append name
      item.append className
      item.append price
      item.append armorName
      item.append primaryWeaponName
      item.append secondaryWeaponName
      item.append movement
      item.append movementTypeName
      item.append carry
      item.append flags
      units.append item

  populateWeapons = (rules) ->
    weapons = $("#weapons tbody")
    forEachProperty rules.weapons, (weapon) ->
      item = $("<tr></tr>")
      name = $("<td></td>")
      name.text weapon.name
      item.append name
      forEachProperty rules.armors, (armor) ->
        power = weapon.powerMap[armor.id]
        powerItem = $("<td></td>")
        powerItem.text (if power then power else "-")
        item.append powerItem

      weapons.append item

  populateRanges = (rules) ->
    ranges = $("#ranges tbody")
    forEachProperty rules.weapons, (weapon) ->
      item = $("<tr></tr>")
      name = $("<td></td>")
      requireDeployed = $("<td></td>")
      name.text weapon.name
      requireDeployed.text (if weapon.requireDeployed then "x" else "")
      item.append name
      max = maxRange(rules)
      range = 1

      while range <= max
        efficiency = weapon.rangeMap[range]
        efficiencyItem = $("<td></td>")
        efficiencyItem.text (if efficiency then efficiency else "-")
        item.append efficiencyItem
        ++range
      item.append requireDeployed
      ranges.append item

  populateDefenses = (rules) ->
    defenses = $("#defenses tbody")
    forEachProperty rules.units, (unit) ->
      movementType = rules.movementTypes[unit.movementType]
      item = $("<tr></tr>")
      name = $("<td></td>")
      image = $("<td></td>")
      pos = theme.getUnitCoordinates(unit.id, 1)
      image.attr "type", unit.id
      image.attr "owner", 1
      image.css "background-image", "url('" + theme.getSpriteSheetUrl() + "')"
      image.addClass "sprite"
      image.css "width", theme.settings.image.width
      image.css "height", theme.settings.image.width
      image.css "background-position", -pos.x + "px " + -pos.y + "px"
      name.text unit.name
      item.append image
      item.append name
      forEachProperty rules.terrains, (terrain) ->
        canTraverse = movementType.effectMap[terrain.id] isnt null
        defense = unit.defenseMap[terrain.id]
        defenseItem = $("<td></td>")
        if canTraverse
          defenseItem.text (if defense isnt `undefined` then defense else terrain.defense)
        else
          defenseItem.text "-"
        item.append defenseItem

      defenses.append item

  populateMovement = (rules) ->
    movements = $("#movement tbody")
    forEachProperty rules.movementTypes, (movementType) ->
      item = $("<tr></tr>")
      name = $("<td></td>")
      name.text movementType.name
      item.append name
      forEachProperty rules.terrains, (terrain) ->
        cost = movementType.effectMap[terrain.id]
        cost = (if cost isnt `undefined` then cost else 1)
        movementItem = $("<td></td>")
        movementItem.text (if cost isnt null then cost else "-")
        item.append movementItem

      movements.append item

