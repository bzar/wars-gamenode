configuration = {
  interface: "0.0.0.0",
  port: 8888,
  enableFileServer: true,
  logTopics: ["performance"],
  crashOnError: true,

  database: {
    type: "jsonfile"
  },
  
  io: {
    logLevel: 0,
    transports: [
      //    'websocket'
      //, 'flashsocket'
      , 'htmlfile'
      , 'xhr-polling'
      , 'jsonp-polling'
    ]
  }
};

exports.configuration = configuration;
