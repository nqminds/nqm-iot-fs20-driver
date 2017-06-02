// Created by Ivan June 2017
module.exports = (function() {
  "use strict";
  const zeroFill = require("./zero-fill");

  // Offsets of FHT data in packet data
  const DEVICE_INDEX = 0;     // Device code 1
  const DEVICE_INDEX_2 = 1;   // Device code 2
  const FUNC_INDEX = 2;       // Function (or actuator address if 0-8)
  const STATUS_INDEX = 3;     // Command
  const PARAM_INDEX = 4;      // Command data

  // Function constants
  const DESIRED_TEMP = 0x41;
  const MEASURED_TEMP_LOW = 0x42;
  const MEASURED_TEMP_HIGH = 0x43;
  const WARNINGS = 0x44;
  const ACK = 0x4b;
  const CAN_XMIT = 0x53;
  const CAN_RCV = 0x54;
  const START_TRANSMIT = 0x7d;
  const END_TRANSMIT = 0x7e;
  const DAY_TEMP = 0x82;
  const NIGHT_TEMP = 0x84;

  // Actuator command constants
  const ACTUATOR_SYNC = 0;
  const ACTUATOR_FULLY_OPEN = 1;
  const ACTUATOR_FULLY_CLOSED = 2;
  const ACTUATOR_POSITION = 6;
  const ACTUATOR_OFFSET_ADJUST = 8;
  const ACTUATOR_DESCALING = 10;
  const ACTUATOR_SYNCING = 12;
  const ACTUATOR_TEST = 14;
  const ACTUATOR_PAIRING = 15;

  const APPLY_TO_CORRECT_DEVICE = 1;
  const APPLY_TO_WRONG_DEVICE = -1;

  class FhtAdapter {
    constructor(packet) {
      this.packet = packet;
    }

    applyTo(fht) {
      if (fht.device && fht.device.length > 0 && this.getDeviceCode().toLowerCase() !== fht.device.toLowerCase()) {
        return APPLY_TO_WRONG_DEVICE;
      }

      fht.device = this.getDeviceCode();

      switch (this.packet.get(FUNC_INDEX)) {
        case 0x00:
          // Broadcast to all actuators.
          // Or target individual actuator...
          // falls through
        case 0x01:
        case 0x02:
        case 0x03:
        case 0x04:
        case 0x05:
        case 0x06:
        case 0x07:
        case 0x08:
          // Actuator function.
          if (this.hasValvePosition()) {
            fht.setData("valvePosition", this.getValvePosition().toFixed(1));
          }
          break;
        case DESIRED_TEMP:
          fht.setData("desiredTemp", this.packet.get(PARAM_INDEX) / 2);
          break;
        case MEASURED_TEMP_LOW:
          fht.setData("lowTemp", this.packet.get(PARAM_INDEX));
          // Only set temperature on receipt of high-temp portion (low-temp is always followed immediately by high-temp).
          // fht.setData("temperature", (fht.getData("highTemp") * 256 + fht.getData("lowTemp"))/10);
          break;
        case MEASURED_TEMP_HIGH:
          fht.setData("highTemp", this.packet.get(PARAM_INDEX));
          fht.setData("temperature", (fht.getData("highTemp") * 256 + fht.getData("lowTemp")) / 10);
          break;
        case DAY_TEMP:
          fht.setData("dayTemp", this.packet.get(PARAM_INDEX) / 2);
          break;
        case NIGHT_TEMP:
          fht.setData("nightTemp", this.packet.get(PARAM_INDEX) / 2);
          break;
        default:
          break;
      }

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

    getValvePosition() {
      if (!this.hasValvePosition()) {
        throw "No position data"; // TODO: this isn't caught anywhere? Should we give incorrect device code?
      }

      return (parseFloat(this.packet.get(PARAM_INDEX)) / 255.0) * 100;
    }

    hasValvePosition() {
      const status = this.packet.get(STATUS_INDEX);
      return this.packet.get(FUNC_INDEX) < 9 && ((status & 0x0f) === ACTUATOR_SYNC || (status & 0x0f) === ACTUATOR_POSITION);
    }

    toString() {
      let cmdString;

      if (this.packet.get(FUNC_INDEX) < 9) {
        const status = this.packet.get(STATUS_INDEX);
        switch (status & 0x0f) {
          case ACTUATOR_SYNC:
            cmdString = `Syncing, valve is at ${((parseFloat(this.packet.get(PARAM_INDEX)) / 255.0) * 100)}`;
            break;
          case ACTUATOR_FULLY_OPEN:
            cmdString = "Valve fully open (ON)";
            break;
          case ACTUATOR_FULLY_CLOSED:
            cmdString = "Valve fully closed (OFF)";
            break;
          case 3:
            // falls through
          case 4:
          case 5:
          case 7:
          case 9:
          case 11:
          case 13:
            cmdString = "Unknown";
            break;
          case ACTUATOR_POSITION:
            cmdString = `Valve at ${((parseFloat(this.packet.get(PARAM_INDEX)) / 255.0) * 100)}`;
            break;
          case ACTUATOR_OFFSET_ADJUST:
            cmdString = `Offsetting ${this.packet.get(PARAM_INDEX)}`;
            break;
          case ACTUATOR_DESCALING:
            cmdString = "Descaling";
            break;
          case ACTUATOR_SYNCING:
            cmdString = "Synchronise countdown";
            break;
          case ACTUATOR_TEST:
            cmdString = "Test";
            break;
          case ACTUATOR_PAIRING:
            cmdString = "Pairing";
            break;
          default:
            break;
        }
      } else {
        switch (this.packet.get(FUNC_INDEX)) {
          case MEASURED_TEMP_LOW:
            cmdString = `Temp Low: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case MEASURED_TEMP_HIGH:
            cmdString = `Temp High: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case DESIRED_TEMP:
            cmdString = `Desired Temp: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case DAY_TEMP:
            cmdString = `Day Temp: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case NIGHT_TEMP:
            cmdString = `Night Temp: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case WARNINGS:
            cmdString = `Warnings: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case ACK:
            cmdString = `Acknowledge: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case CAN_XMIT:
            cmdString = `Can transmit: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case CAN_RCV:
            cmdString = `Can receive: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case START_TRANSMIT:
            cmdString = `Start transmit: ${this.packet.get(PARAM_INDEX)}`;
            break;
          case END_TRANSMIT:
            cmdString = `End transmit: ${this.packet.get(PARAM_INDEX)}`;
            break;
          default:
            cmdString = `Packet not processed, function is ${this.packet.get(FUNC_INDEX).toString(16)} parameter is ${this.packet.get(PARAM_INDEX).toString(16)}`;
            break;
        }
      }
      return cmdString;
    }
  }

  return FhtAdapter;
}());
