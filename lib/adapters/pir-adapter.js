// Created by Ivan June 2017
module.exports = (function() {
  "use strict";
  const zeroFill = require("./zero-fill");

  const APPLY_TO_CORRECT_DEVICE = 1;
  const APPLY_TO_WRONG_DEVICE = -1;
  const DEVICE_INDEX = 0;

  class PirAdapter {
    constructor(packet) {
      this.packet = packet;
    }

    applyTo(pir) {
      if (pir.device && pir.device.length > 0 && this.getDeviceCode().toLowerCase() !== pir.device.toLowerCase()) {
        return APPLY_TO_WRONG_DEVICE;
      }

      pir.device = this.getDeviceCode();

      const data = this.parse();
      pir.setData("brightness", data.brightness);

      return APPLY_TO_CORRECT_DEVICE;
    }

    getDeviceCode() {
      let deviceCode;
      const c1 = this.packet.get(DEVICE_INDEX);
      if (typeof c1 !== "undefined") {
        const c2 = this.packet.get(DEVICE_INDEX + 1);
        if (typeof c2 !== "undefined") {
          deviceCode = this.packet.getHeader() + zeroFill(c1.toString(16), 2) + zeroFill(c2.toString(16), 2);
        } else {
          deviceCode = this.packet.getHeader() + zeroFill(c1.toString(16), 2);
        }
      } else {
        deviceCode = this.packet.getHeader();
      }
      return deviceCode;
    }

    parse() {
      const brightness = this.packet.get(5);
      return {
        brightness,
      };
    }

    toString() {
      const data = this.parse();
      const cmdString = `Brightness: ${data.brightness}`;
      return cmdString;
    }
  }

  return PirAdapter;
}());
