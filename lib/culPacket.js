"use strict";

module.exports = (function () {
  var console = { log: require("debug")("culPacket") }

  // Constructor
  function culPacket() {
    this.headerLength = 0;
    this.packet = [];
  }
 
  culPacket.prototype.parseString = function(str,cb) {
    try {
      this.load(str);
      cb(true);
    } catch (e) {
      console.log("parseString error: " + e.message);
      cb(false);
  }
  };

  culPacket.prototype.load = function(buffer) {
    var loaded = false;

    this.packet = [];

    if (buffer.length > 0) {
      // Start byte.
      this.packet.push(buffer[0].charCodeAt(0));
      this.headerLength = 1;

      var bytes = [];
      for (var i = 1; i < buffer.length; i++) {
        bytes.push(buffer[i]);

        // Convert raw bytes to hex
        if (bytes.length == 2) {
          this.packet.push((parseInt(bytes[0],16) << 4) + parseInt(bytes[1],16));
          bytes = [];
        }
      }

      loaded = true;
    }

    return loaded;
  };

  culPacket.prototype.getHeader = function() {
    return String.fromCharCode(this.packet[0]);
  };

  culPacket.prototype.getRaw = function() {
    return new Buffer(this.packet);
  };

  culPacket.prototype.get = function(idx) {
    return this.packet[this.headerLength + idx];
  };

  culPacket.prototype.getData = function() {
    return this.packet.slice(this.headerLength);
  };
  
  culPacket.prototype.fromString = function(str) {
    this.packet = [START_BYTE.charCodeAt(0)];
    this.headerLength = this.packet.length;
    
    for (var i = 0; i < str.length; i+=2) {
      var val = (parseInt(str[i],16) << 4) + parseInt(str[i+1],16);
      this.packet.push(val);
    }    
  };
  
  culPacket.prototype.toString = function() {
    var str = this.getHeader();
    for (var i = 1; i < this.packet.length; i++) {
      // Zero-pad as 2-digit hex value
      str = str + ("00" + this.packet[i].toString(16)).substr(-2);
    }
    return str;
  };
  
  return culPacket;
})();