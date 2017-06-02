// Created by Ivan June 2017
module.exports = (function() {
  "use strict";
  const zeroFill = require("./zero-fill");
  const DEVICE_INDEX = 0;
  const APPLY_TO_WRONG_DEVICE = -1;
  const APPLY_TO_CORRECT_DEVICE = 1;

  class AshAdapter {
    constructor(packet) {
      this.packet = packet;
    }

    applyTo(ash) {
      if (ash.device && ash.device.length > 0 && this.getDeviceCode().toLowerCase() !== ash.device.toLowerCase()) {
        return APPLY_TO_WRONG_DEVICE;
      }

      ash.device = this.getDeviceCode();

      const data = this.parse();
      ash.setData("temperature", data.temp);
      ash.setData("humidity", data.humidity);

      return APPLY_TO_CORRECT_DEVICE;
    }

    getDeviceCode() {
      return this.packet.getHeader() + zeroFill(this.packet.get(DEVICE_INDEX).toString(16), 2);
    }

    parse() {
      const tempSign = (this.packet.get(0) & 0x80) === 0 ? 1 : -1;
      const tempTens = this.packet.get(2) & 0x0f;
      const tempUnits = this.packet.get(1) >> 4;
      const tempTenths = this.packet.get(1) & 0x0f;
      const humidTens = this.packet.get(3) >> 4;
      const humidUnits = this.packet.get(3) & 0x0f;
      const humidTenths = this.packet.get(2) >> 4;

      return {
        humidity: humidTens * 10 + humidUnits + humidTenths * 0.1,
        temp: tempSign * (tempTens * 10 + tempUnits + tempTenths * 0.1),
      };
    }

    toString() {
      const data = this.parse();
      const cmdString = `Temp: ${data.temp} Humidity: ${data.humidity}`;
      return cmdString;
    }
  }

  return AshAdapter;
}());
