function Timer(interval) {
  this.interval = interval ? interval : 100;
  this.running = false;
  this.next = null;
  this.ticks = 0;
}

exports.Timer = Timer;

function TimerItem(callback, timeout, prev, next, group) {
  this.callback = callback;
  this.timeout = timeout;
  this.next = next;
  this.prev = prev;
  this.group = group;
}

Timer.prototype.start = function() {
  this.running = true;
  this.scheduleTimeout();
}

Timer.prototype.scheduleTimeout = function() {
  var this_ = this;
  setInterval(function() {
    if(this_.running) {
      this_.timeout();
    }
  }, this.interval);
}

Timer.prototype.timeout = function() {
  this.ticks += 1;
  while(this.next !== null && this.next.timeout <= this.ticks) {
    this.next.callback();
    this.next = this.next.next;
    if(this.next !== null)
      this.next.prev = this;
  }
}

Timer.prototype.addTimer = function(callback, msec, group) {
  var tick = this.ticks + Math.round(msec / this.interval);
  var item = new TimerItem(callback, tick, this, this.next, group);
  
  while(item.next !== null && item.next.timeout < item.timeout) {
    item.prev = item.next;
    item.next = item.next.next;
  }
  
  item.prev.next = item;
  if(item.next) {
    item.next.prev = item;
  }
}

Timer.prototype.removeGroup = function(group) {
  var timer = this.next;
  while(timer !== null) {
    var next = timer.next;
    if(timer.group == group) {
      timer.prev.next = timer.next;
      if(timer.next !== null) {
          timer.next.prev = timer.prev;
      }
      timer.next = null;
      timer.prev = null;
    }
    timer = next;
  }
}