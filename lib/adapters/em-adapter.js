// Created by Ivan June 2017
module.exports = (function() {
  "use strict";
  const zeroFill = require("./zero-fill");
  // Offsets of FHT data in packet data
  const APPLY_TO_CORRECT_DEVICE = 1;
  const APPLY_TO_WRONG_DEVICE = -1;
  const COUNTER_INDEX = 2;
  const CUMULATIVE_INDEX = 3;
  const DEVICE_INDEX = 0;     // Device code
  const INTERVAL_INDEX = 5;
  const PEAK_INDEX = 7;

  class EmAdapter {
    constructor(packet) {
      this.packet = packet;
    }

    applyTo(em) {
      if (em.device && em.device.length > 0 && this.getDeviceCode().toLowerCase() !== em.device.toLowerCase()) {
        return APPLY_TO_WRONG_DEVICE;
      }

      em.device = this.getDeviceCode();
      em.setData("counter", this.packet.get(COUNTER_INDEX));

      const cumulativeRevs = this.packet.get(CUMULATIVE_INDEX + 1) * 256 + this.packet.get(CUMULATIVE_INDEX);
      const cumulativeConsumption = cumulativeRevs; // / em.config.revsPerkWh
      em.setData("cumulative", cumulativeConsumption);

      // The number of revolutions in the last interval (5 mins)
      const intervalRevs = this.packet.get(INTERVAL_INDEX + 1) * 256 + this.packet.get(INTERVAL_INDEX);
      // The equivalent hourly consumption (given 12 intervals of 5 mins in an hour)
      const intervalConsumption = (intervalRevs * 12); // / em.config.revsPerkWh
      em.setData("interval", intervalConsumption);

      // The time in seconds of the fastest revolutionin the interval (5 mins)
      const peakTime = (this.packet.get(PEAK_INDEX + 1) * 256 + this.packet.get(PEAK_INDEX)) / 10;
      const peakConsumption = (3600 / peakTime); // / em.config.revsPerkWh;
      em.setData("peak", peakConsumption.toFixed(1));

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

    toString() {
      const cmdString = `Counter: ${this.packet.get(COUNTER_INDEX)} Cumulative: ${this.packet.get(CUMULATIVE_INDEX + 1 ) * 256 + this.packet.get(CUMULATIVE_INDEX)} Interval: ${this.packet.get(INTERVAL_INDEX + 1) * 256 + this.packet.get(INTERVAL_INDEX)}, Peak: ${this.packet.get(PEAK_INDEX + 1) * 256 + this.packet.get(PEAK_INDEX)}`;
      return cmdString;
    }
  }

  return EmAdapter;
}());
