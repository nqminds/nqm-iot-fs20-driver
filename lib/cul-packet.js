// Created by Ivan June 2017
module.exports = (function() {
  "use strict";
  const output = require("nqm-databot-utils").output;

  class CulPacket {
    constructor() {
      this.headerLength = 0;
      this.packet = [];
    }

    fromString(str) {
      this.packet = [START_BYTE.charCodeAt(0)];
      this.headerLength = this.packet.length;

      for (let i = 0; i < str.length; i += 2) {
        const val = (parseInt(str[i], 16) << 4) + parseInt(str[i + 1], 16);
        this.packet.push(val);
      }
    }

    get(idx) {
      return this.packet[this.headerLength + idx];
    }

    getData() {
      return this.packet.slice(this.headerLength);
    }

    getHeader() {
      return String.fromCharCode(this.packet[0]);
    }

    getRaw() {
      return new Buffer(this.packet);
    }

    /**
     * Attempts to parse a buffer
     * @param {string} buffer 
     */
    load(buffer) {
      let loaded = false;

      this.packet = [];

      if (buffer.length > 0) {
        // Start byte
        this.packet.push(buffer[0].charCodeAt(0));
        this.headerLength = 1;

        let bytes = [];
        for (let i = 1; i < buffer.length; i++) {
          bytes.push(buffer[i]);

          // Convert raw bytes to hex
          if (bytes.length === 2) {
            this.packet.push((parseInt(bytes[0], 16) << 4) + parseInt(bytes[1], 16));
            bytes = [];
          }
        }
        loaded = true;
      }
      return Promise.resolve(loaded);
    }

    parseString(str) {
      return this.load(str)
      .return(true)
      .catch((err) => {
        output.debug(`FS20 - parseString error - ${err.messag}`);
        return Promise.resolve(false);
      });
    }

    toString() {
      let str = this.getHeader();
      for (let i = 1; i < this.packet.length; i++) {
        str += `00${this.packet[i].toString(16)}`.substr(-2);
      }
      return str;
    }
  }

  return CulPacket;
}());
