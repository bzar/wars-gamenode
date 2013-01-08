class MessageTicker
  constructor: (@box, @map) ->
    @showAll = false
    @numMessages = 10
  
(exports ? this).MessageTicker = MessageTicker

MessageTicker::showToggle = ->
  @showAll = not @showAll
  if @showAll
    if @onlyShort
      @onlyShort = false
      @getEventLog()
    $(".tickerMessage", @box).show()
  else
    $(".tickerMessage:gt(" + (@numMessages - 1) + ")", @box).hide()

MessageTicker::setMessages = (msgArray) ->
  @box.empty()
  if msgArray and msgArray.length > 0
    for msg in msgArray
      msg = @parseMessage(msg)
      continue  if msg is null
      @box.append msg
    $(".tickerMessage:gt(" + (@numMessages - 1) + ")", @box).hide()

MessageTicker::showOldMessages = (msgArray) ->
  if msgArray and msgArray.length > 0
    for msg in msgArray
      msg = @parseMessage(msg)
      continue  if msg is null
      @box.append msg

MessageTicker::showMessages = (msgArray) ->
  if msgArray and msgArray.length > 0
    for msg, i in msgArray
      msg = @parseMessage(msg)
      continue  if msg is null
      @box.prepend msg
      msg.hide()
      setTimeout (=>
        msg.show()
        $(".tickerMessage:last", this.box).hide()  unless @showAll
      ), i * 500

MessageTicker::parseMessage = (message) ->
  msg = null
  player = null
  time = new Date(Date.parse(message.time))
  data = message.content
  if data.action is "attack"
    msg = [
      type: "unit"
      unit: data.attacker
    ,
      type: "text"
      text: "attacks"
    ,
      type: "unit"
      unit: data.target
    ,
      type: "text"
      text: "inflicting " + data.damage + "% damage"
    ]
    player = data.attacker.owner
  else if data.action is "counterattack"
    if data.damage
      msg = [
        type: "unit"
        unit: data.attacker
      ,
        type: "text"
        text: "counterattacks"
      ,
        type: "unit"
        unit: data.target
      ,
        type: "text"
        text: "inflicting " + data.damage + "% damage"
      ]
    else
      msg = [
        type: "unit"
        unit: data.attacker
      ,
        type: "text"
        text: "cannot counterattack"
      ,
        type: "unit"
        unit: data.target
      ]
    player = data.attacker.owner
  else if data.action is "capture"
    msg = [
      type: "unit"
      unit: data.unit
    ,
      type: "text"
      text: "captures"
    ,
      type: "tile"
      tile: data.tile
    ,
      type: "text"
      text: "(" + data.left + " capture points left)"
    ]
    player = data.unit.owner
  else if data.action is "captured"
    msg = [
      type: "unit"
      unit: data.unit
    ,
      type: "text"
      text: "captured"
    ,
      type: "tile"
      tile: data.tile
    ]
    player = data.unit.owner
  else if data.action is "deploy"
    msg = [
      type: "unit"
      unit: data.unit
    ,
      type: "text"
      text: "deploys"
    ]
    player = data.unit.owner
  else if data.action is "undeploy"
    msg = [
      type: "unit"
      unit: data.unit
    ,
      type: "text"
      text: "undeploys"
    ]
    player = data.unit.owner
  else if data.action is "load"
    msg = [
      type: "unit"
      unit: data.unit
    ,
      type: "text"
      text: "loads into"
    ,
      type: "unit"
      unit: data.carrier
    ]
    player = data.unit.owner
  else if data.action is "unload"
    msg = [
      type: "unit"
      unit: data.unit
    ,
      type: "text"
      text: "unloads from"
    ,
      type: "unit"
      unit: data.carrier
    ]
    player = data.unit.owner
  else if data.action is "destroyed"
    msg = [
      type: "unit"
      unit: data.unit
    ,
      type: "text"
      text: "is destroyed"
    ]
    player = data.unit.owner
  else if data.action is "repair"
    msg = [
      type: "tile"
      tile: data.tile
    ,
      type: "text"
      text: "heals"
    ,
      type: "unit"
      unit: data.unit
    ,
      type: "text"
      text: "to " + data.newHealth + "% health"
    ]
    player = data.unit.owner
  else if data.action is "build"
    msg = [
      type: "tile"
      tile: data.tile
    ,
      type: "text"
      text: "builds"
    ,
      type: "unit"
      unit: data.unit
    ]
    player = data.unit.owner
  else if data.action is "regenerateCapturePoints"
    msg = [
      type: "tile"
      tile: data.tile
    ,
      type: "text"
      text: "regenerates capture points (" + data.newCapturePoints + " left)"
    ]
    player = data.tile.owner
  else if data.action is "produceFunds"
    msg = [
      type: "tile"
      tile: data.tile
    ,
      type: "text"
      text: "produces funds"
    ]
    player = data.tile.owner
  else if data.action is "beginTurn"
    msg = [
      type: "text"
      text: "Player " + data.player + "'s turn"
    ]
    player = data.player
  else if data.action is "endTurn"
    msg = [
      type: "text"
      text: "Player " + data.player + " yields the turn"
    ]
    player = data.player
  else if data.action is "turnTimeout"
    msg = [
      type: "text"
      text: "Player " + data.player + "'s turn timed out"
    ]
    player = data.player
  else if data.action is "surrender"
    msg = [
      type: "text"
      text: "Player " + data.player + " surrenders!"
    ]
    player = data.player
  else if data.action is "finished"
    msg = [
      type: "text"
      text: "Game finished! Player " + data.winner + " wins!"
    ]
    player = data.winner
  else
    return null
  msg.unshift
    type: "time"
    time: time

  tickerMessage = $("<li></li>")
  tickerMessage.addClass "tickerMessage"
  tickerMessage.css "background-color", @map.theme.getPlayerColorString(parseInt(player))  if player
  @createTickerMessage msg, tickerMessage
  tickerMessage

MessageTicker::createTickerMessage = (parts, rootElement) ->
  for part in parts
    if part.type is "text"
      text = $("<span></span>")
      text.text part.text
      rootElement.append text
    else if part.type is "time"
      text = $("<span></span>")
      timeString = "[" + part.time.getFullYear() + "-" + zeroPad(part.time.getMonth() + 1, 2) + "-" + zeroPad(part.time.getDate(), 2) + " " + zeroPad(part.time.getHours(), 2) + ":" + zeroPad(part.time.getMinutes(), 2) + ":" + zeroPad(part.time.getSeconds(), 2) + "] "
      text.text timeString
      text.addClass "time"
      rootElement.append text
    else if part.type is "unit"
      image = $("<span></span>")
      image.addClass "sprite"
      image.css "background-image", "url(" + @map.theme.getSpriteSheetUrl() + ")"
      pos = @map.theme.getUnitCoordinates(part.unit.type, part.unit.owner)
      image.css "background-position", -pos.x + "px " + -pos.y + "px"
      image.css "width", @map.theme.settings.image.width
      image.css "height", @map.theme.settings.image.height
      rootElement.append image
    else if part.type is "tile"
      image = $("<span></span>")
      image.addClass "sprite"
      image.css "background-image", "url(" + @map.theme.getSpriteSheetUrl() + ")"
      pos = @map.theme.getTileCoordinates(part.tile.type, part.tile.subtype, part.tile.owner)
      image.css "background-position", -pos.x + "px " + (-pos.y + (@map.theme.settings.image.height - @map.theme.settings.hex.height - @map.theme.settings.hex.thickness)) + "px"
      image.css "width", @map.theme.settings.image.width
      image.css "height", @map.theme.settings.image.height
      propPos = @map.theme.getTilePropCoordinates(part.tile.type, part.tile.subtype, part.tile.owner)
      if propPos
        terrainProp = $("<span></span>")
        terrainProp.css "background-image", "url('" + @map.theme.getSpriteSheetUrl() + "')"
        terrainProp.css "width", @map.theme.settings.image.width
        terrainProp.css "height", @map.theme.settings.image.height
        terrainProp.css "display", "block"
        terrainProp.css "background-position", -propPos.x + "px " + (-propPos.y - @map.theme.settings.hex.thickness) + "px"
        image.append terrainProp
      rootElement.append image
