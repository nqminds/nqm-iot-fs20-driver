// Created by Ivan June 2017
module.exports = (function() {
  "use strict";
  const EventEmitter = require("events").EventEmitter;
  const Promise = require("bluebird");
  const SerialPort = require("serialport");
  const _ = require("lodash");
  const output = require("nqm-databot-utils").output;

  const FS20Device = require("./fs20-device");
  const CulPacket = require("./cul-packet");
  const fs20Config = require("./fs20-config.json");
  const AdapterFactory = require("./adapter-factory");

  const delimiter = "\r\n";

  class FS20Driver extends EventEmitter {
    /**
     * Constructor for FS20Driver class
     * @param {object} config - Parameters for configuring driver
     */
    constructor(config) {
      super();
      this.config = config;
      this.packet = null;
      this.fs20Devices = {};

      this.serialPort = new SerialPort(
        this.config.port,
        {
          autoOpen: false,
          baudrate: 38400,
          parser: SerialPort.parsers.readline(delimiter),
        }
      );
    }

    /**
     * Promise wrapper for serialport's close method
     */
    closePort() {
      output.debug("closing port");
      return new Promise((resolve, reject) => {
        this.serialPort.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    /**
     * Initialises each sensor in config as an fs20 device instance
     */
    initSensors() {
      const sensors = this.config.sensors;
      _.each(sensors, (sensor) => {
        const fs20Type = sensor.id[0];
        if (fs20Config[fs20Type]) {
          const config = fs20Config[fs20Type];
          this.fs20Devices[sensor.id] = new FS20Device(sensor.id, sensor, config.services);
        } else {
          output.debug(`No FS20 config found for sensor ${sensor.id}`);
        }
      });
    }

    /**
     * Checks to see if driver is set to monitor device identified by deviceCode
     * @param {*} deviceCode - Does this identify a specific device or a device type?
     */
    isMonitored(deviceCode) {
      const device = _.find(this.config.sensors, (sensor) => sensor.id === deviceCode);
      if (typeof device === "undefined") {
        return false;
      } else {
        return true;
      }
    }

    /**
     * Identifies the type of the new packet, instantiates adapter to parse data then emits
     * if readings have changed
     */
    onPacketReceived() {
      const adapter = AdapterFactory(this.packet);
      if (typeof adapter !== "undefined") {
        const deviceCode = adapter.getDeviceCode().toLowerCase();
        if (this.isMonitored(deviceCode)) {
          const fs20Device = this.fs20Devices[deviceCode];
          const old = fs20Device.getServiceData();
          adapter.applyTo(fs20Device);
          const update = fs20Device.getServiceData();

          if (_.isEqual(old, update)) {
            output.debug(`FS20 - data not changed for ${deviceCode}`);
          } else {
            update.timestamp = this.packet.timestamp;
            this.emit("data", fs20Device.getConfig().feedId, update);
          }
        }
      }
    }

    /**
     * Promise wrapper for serialport's open port method
     * This may require elevated privileges
     */
    openPort() {
      output.debug("opening port");
      return new Promise((resolve, reject) => {
        this.serialPort.open((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    /**
     * Attempts to load a newly received packet
     * @param {buffer} data - Buffer emitted by sensor to serial port
     */
    receivePacket(data) {
      this.packet.load(data)
      .then((loaded) => {
        if (loaded) {
          this.packet.timestamp = Date.now();
          this.onPacketReceived();
        } else {
          output.debug("FS20 - Empty packet");
        }
      });
    }

    /**
     * Initialises each sensor in config, intialises packet and opens serial port
     */
    start() {
      this.initSensors();

      return this.openPort()
      .then(() => {
        this.packet = new CulPacket();
        this.serialPort.on("data", (data) => {
          if (typeof data !== "undefined" && data !== null) {
            this.receivePacket(data);
          }
        });

        this.serialPort.on("error", (err) => {
          output.debug(`FS20 - Port error - ${err.message}`);
        });

        this.serialPort.write(`V${delimiter}`);
        this.serialPort.write(`X61${delimiter}`);

        return Promise.resolve();
      })
      .catch((err) => {
        return Promise.reject(new Error(`FS20 - Failed to open port - ${err.message}`));
      });
    }
  }

  return FS20Driver;
}());
