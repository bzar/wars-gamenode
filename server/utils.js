function Timer(label) {
  this.label = label;
  this.start = (new Date()).getTime();
}

exports.Timer = Timer;

Timer.prototype.end = function() {
  console.log("[TIMER] " + this.label + ": " + ((new Date()).getTime() - this.start) + "ms");
}

