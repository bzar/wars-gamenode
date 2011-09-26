var configuration = {
  interface: "0.0.0.0",
  port: 8888,
  host: "localhost",
  enableFileServer: true,
  logTopics: ["error", "performance", "email", "game"],
  crashOnError: true,

  database: {
    type: "mongodb",
    host: "localhost",
    port: 27017,
    database: "wars"
  },

  salt: "Change this to a random string to salt the passwords with",
  
  io: {
    logLevel: 0,
    transports: [
      //    'websocket'
      //, 'flashsocket'
      , 'htmlfile'
      , 'xhr-polling'
      , 'jsonp-polling'
    ]
  },
  
  email: {
    enabled: false,
    
    server: {
      host: "localhost",
      port: 587,
      ssl: true,
      username: "wars",
      password: "secret",
    },
        
    message: {
      senderAddress: "wars@localhost",
      subject: "Wars: [{{game.name}}] {{user.username}}, it's your turn!",
      content: "<html><body><p>Wars: [{{game.name}}] {{user.username}}, it's your turn! (<a href=\"http://{{configuration.host}}/game.html?game={{game.gameId}}\">link</a>)</p></body></html>",
      serverAddress: "localhost"
    }
  }
};

exports.configuration = configuration;
