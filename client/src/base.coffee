populateNavigation = (session) ->
  $("#logout").click (e) ->
    e.preventDefault()
    session.close()

zeroPad = (str, len) ->
  s = str.toString()
  s = "0" + s while s.length < len
  s
  
timeString = (t) -> t.getFullYear() + "-" + 
                    zeroPad(t.getMonth() + 1, 2) + 
                    "-" + zeroPad(t.getDate(), 2) + 
                    " " + zeroPad(t.getHours(), 2) + 
                    ":" + zeroPad(t.getMinutes(), 2)
                    
addChatMessage = (time, sender, content) ->
  messages = $("#chatMessages")
  messageItem = $("<li></li>")
  messageTime = $("<span></span>")
  messageSender = $("<span></span>")
  messageContent = $("<span></span>")
  t = new Date(Date.parse(time))
  messageTime.text timeString t
  messageTime.addClass "messageTime"
  messageSender.text sender
  messageSender.addClass "messageSender"
  messageContent.text content
  messageContent.addClass "messageContent"
  messageItem.append messageTime
  messageItem.append messageSender
  messageItem.append messageContent
  messages.append messageItem
  messages.scrollTop messages[0].scrollHeight
  
initializeChat = (client, gameId) ->
  if not gameId?
    client.stub.subscribeLobbyChat()
  else
    client.stub.chatMessages gameId, (response) ->
      if not response.success
        alert "Could not get chat messages! " + response.reason
        return

      for message in response.chatMessages
        addChatMessage message.time, message.sender, message.content

  client.skeleton.chatMessage = (time, sender, content) ->
    addChatMessage time, sender, content
    $("#showChat").addClass "highlight"  if $("#chat").css("display") is "none"

  $("#showHideChat").click (e) ->
    e.preventDefault()
    chat = $("#chat")
    if chat.hasClass("small")
      chat.removeClass "small"
    else
      chat.addClass "small"
      messages = $("#chatMessages")
      messages.scrollTop messages[0].scrollHeight

  $("#chatForm").submit (e) ->
    e.preventDefault()
    message = $("#chatInput").val()
    $("#chatInput").val ""
    if message.length > 0
      if gameId?
        client.stub.chat gameId, message
      else
        client.stub.lobbyChat message

forEachProperty = (object, callback) ->
  for key of object
    callback object[key], key, object  if object.hasOwnProperty(key)
    
getObjectWithId = (from, id) ->
  object = null
  forEachProperty from, (value) ->
    object = (if value.id is id then value else object)

  return object
  
class Paginator 
  constructor: (@data, @clearItemsFunc, @addItemFunc) ->
    @pageSize = 10
    @currentPage = 0
  
  nextPage: -> Math.min @currentPage + 1, @lastPage()
  prevPage: -> Math.max @currentPage - 1, @firstPage()
  firstPage: -> 1
  lastPage: -> @pages()
  pages: -> if @data.length > 0 then Math.ceil @data.length / @pageSize else 1

  setPage: (pageNum) ->
    if pageNum <= @lastPage() and pageNum >= @firstPage()
      @currentPage = pageNum
      firstElem = Math.max(0, Math.min((pageNum - 1) * @pageSize, @data.length - 1))
      lastElem = Math.max(0, Math.min(pageNum * @pageSize, @data.length))
      @clearItemsFunc()
      i = firstElem

      while i < lastElem
        @addItemFunc @data[i]
        ++i
    this


e = exports ? this
e.populateNavigation = populateNavigation
e.zeroPad = zeroPad
e.addChatMessage = addChatMessage
e.initializeChat = initializeChat
e.Paginator = Paginator
e.forEachProperty
e.getObjectWithId
