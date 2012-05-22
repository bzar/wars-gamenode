function User(userId, username, password, email, settings) {
  this.userId = userId;
  this.username = username;
  this.password = password;
  this.email = email;
  this.settings = {
    emailNotifications: settings.emailNotifications,
    gameTheme: settings.gameTheme,
    animationSpeed: settings.animationSpeed
  };
};

exports.User = User;

User.prototype.clone = function() {
  var u = new User(this.userId, this.username, this.password, this.email, 
                   {emailNotifications: this.settings.emailNotifications,
                    gameTheme: this.settings.gameTheme,
                    animationSpeed: other.settings.animationSpeed});
  return u;
}

User.prototype.cloneFrom = function(other) {
  this.userId = other.userId;
  this.username = other.username;
  this.password = other.password;
  this.email = other.email;
  this.settings = {
    emailNotifications: other.settings.emailNotifications,
    gameTheme: other.settings.gameTheme,
    animationSpeed: other.settings.animationSpeed
  };
  
  return this;
};