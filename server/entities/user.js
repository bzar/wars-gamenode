function User(userId, username, password, email, settings) {
  this.userId = userId;
  this.username = username;
  this.password = password;
  this.email = email;
  this.settings = {
    emailNotifications: settings.emailNotifications,
    gameTheme: settings.gameTheme
  };
};

exports.User = User;
