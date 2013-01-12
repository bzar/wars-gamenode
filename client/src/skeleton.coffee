class Skeleton
  constructor: (@server) ->

Skeleton::playerJoined = (gameId, playerNumber, playerName, isMe) ->

Skeleton::playerLeft = (gameId, playerNumber) ->

Skeleton::bannedUnits = (unitTypes) ->

Skeleton::gameStarted = (gameId) ->

Skeleton::gameFinished = (gameId) ->

Skeleton::gameTurnChange = (gameId, newTurn, newRound, turnRemaining) ->

Skeleton::gameEvents = (gameId, events) ->

Skeleton::chatMessage = (messageInfo) ->

Skeleton::addInvite = (gameId) ->

Skeleton::removeInvite = (gameId) ->

(exports ? this).Skeleton = Skeleton