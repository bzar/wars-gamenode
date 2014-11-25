var email = require("nodemailer");
var utils = require("./utils");
var configuration = require("./configuration").configuration;

email.SMTP = {
  host: configuration.email.server.host,
  port: configuration.email.server.port,
  ssl: configuration.email.server.ssl,
  domain: "localhost",
  use_authentication: true,
  user: configuration.email.server.username,
  pass: configuration.email.server.password,
}

function replaceAll(params, string) {
  return string.replace(/{{([^}]*)}}/g, function(substr, key) {
    var value = params;
    var parts = key.split(".");
    for(var i = 0; i < parts.length; ++i) {
      if(parts[i] in value) {
        value = value[parts[i]];
      } else {
        return "[INVALID KEY: " + key + "]";
      }
    }
    return value;
  });
}

exports.sendTurnNotification = function(game, player, user) {
  if(configuration.email.enabled && player.settings.emailNotifications) {
    var params = {
      "game": game,
      "player": player,
      "user": user,
      "configuration": configuration,
    }
    
    var message = {
      sender: configuration.email.message.senderAddress,
      to: user.email,
      subject: replaceAll(params, configuration.email.message.subject),
      html: replaceAll(params, configuration.email.message.content)
    }
    
    utils.log("email", "Sending turn notification email to " + user.username);
    email.send_mail(message, function(error, success) {
      if(!success) {
        utils.log("error", "Error: " + error);
      }
    });
  }
}
