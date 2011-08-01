exports.create = function(backend, params) {
  var backendFunc = require("./backends/" + backend).implementation;
  var database = new backendFunc(params);
  return database;
}