configuration = require("./configuration").configuration;

function Timer(label, topic) {
  this.label = label;
  this.start = (new Date()).getTime();
  this.topic = topic ? topic : "performance";
  
  if(configuration.logTopics.indexOf(this.topic) != -1) {
    console.log("[TIMER] > " + this.label);
  }
}

exports.Timer = Timer;

Timer.prototype.end = function() {
  if(configuration.logTopics.indexOf(this.topic) != -1) {
    console.log("[TIMER] < " + this.label + ": " + ((new Date()).getTime() - this.start) + "ms");
  }
}

