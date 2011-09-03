var configuration = require("./configuration").configuration;
var EventEmitter = require('events').EventEmitter;

function Timer(label, topic) {
  this.label = label;
  this.start = (new Date()).getTime();
  this.topic = topic ? topic : "performance";
  
  if(configuration.logTopics.indexOf(this.topic) != -1) {
    exports.log(this.topic, "> " + this.label);
  }
}

exports.Timer = Timer;

Timer.prototype.end = function() {
  exports.log(this.topic, "< " + this.label + ": " + ((new Date()).getTime() - this.start) + "ms");
}

function ISODateString(d){
  function pad(n){return n<10 ? '0'+n : n}
  return d.getUTCFullYear()+'-'
    + pad(d.getUTCMonth()+1)+'-'
    + pad(d.getUTCDate())+'T'
    + pad(d.getUTCHours())+':'
    + pad(d.getUTCMinutes())+':'
    + pad(d.getUTCSeconds())+'Z'
}

exports.log = function(topic, message) {
  if(configuration.logTopics.indexOf(topic) != -1) {
    console.log(ISODateString(new Date()) + " [" + topic + "] " + message);
  }
}

function Mutex() {
  this.queue = new EventEmitter();
  this.locked = false;
}

exports.Mutex = Mutex;

Mutex.prototype.lock = function(fn) {
  if(this.locked) {
    var this_ = this;
    this.queue.once('ready',function() {
      this_.lock(fn);
    });
  } else {
    this.locked = true;
    fn();
  }
}

Mutex.prototype.release = function release() {
  this.locked = false;
  this.queue.emit('ready');
}
