"use strict";

module.exports = (function() {
  var console = process.console ? process.console : global.console;
  var util = require('util');
  var eventEmitter = require('events').EventEmitter;
  var SerialPortModule = require("serialport");
  var SerialPort = SerialPortModule.SerialPort;

  var culPacket = require('./culPacket');
  var FS20DeviceClass = require("./fs20Device");
  var fs20Config = require("../fs20Config.json");
  var delimiter = "\r\n";
  var fs20Devices = {};

  function FS20Driver(config) {
    eventEmitter.call(this);

    this._config = config;
    this._serialPort = null;
    this._packet = null;
  }

  util.inherits(FS20Driver, eventEmitter);

  function getAdapter(packet) {
    var adapter;

    switch (packet.getHeader()) {
      case "T":
        var fhtAdapter = require("./adapters/fhtAdapter");
        adapter = new fhtAdapter(packet);
        break;
      case "E":
        var emAdapter = require("./adapters/emAdapter");
        adapter = new emAdapter(packet);
        break;
      case "K":
        var ashAdapter = require("./adapters/ashAdapter");
        adapter = new ashAdapter(packet);
        break;
      case "F":
        var pirAdapter = require("./adapters/pirAdapter");
        adapter = new pirAdapter(packet);
        break;
      default:
        console.log("FS20 adapter not found for: " + packet.getHeader());
        break;
    }

    return adapter;
  };

  function initSensors() {
    var sensors = this._config.sensors;
    for (var i = 0; i < sensors.length; i++) {
      var sensor = sensors[i];
      var fs20Type = sensor.id[0];
      if (fs20Config.hasOwnProperty(fs20Type)) {
        var cfg = fs20Config[fs20Type];
        fs20Devices[sensor.id] = new FS20DeviceClass(sensor.id,sensor,cfg.services);
      } else {
        logger.info("no FS20 config found for sensor " + sensor.id);
      }
    }
  }

  FS20Driver.prototype.start = function() {
    var self = this;

    initSensors.call(this);

    this._serialPort = new SerialPort(this._config.port, { parser: SerialPortModule.parsers.readline(delimiter), baudrate: 38400 }, function(err) {
      if (err) {
        console.log("failed to open port " + self._config.port + " - " + JSON.stringify(err));
      }
    });

    this._serialPort.on("open", function() {
      console.log("opened port");
      self._packet = new culPacket();
      self._serialPort.on("data", function(data) {
        if (typeof data !== "undefined" && data !== null) {
          receivePacket.call(self, data);
        }
      });

      // Initialise the COC
      self._serialPort.write("V" + delimiter);
      self._serialPort.write("X61" + delimiter);
    });

    this._serialPort.on("error", function(e) {
      console.log("port error: " + JSON.stringify(e));
    })
  };

  function receivePacket(data) {
    console.log("---------------------------------------------");
    if (this._packet.load(data)) {
      var packetString = this._packet.toString();
      console.log(packetString);

      this._packet.timestamp = Date.now();
      onPacketReceived.call(this, this._packet);
    } else {
      console.log("empty packet!");
    }
    console.log("---------------------------------------------");
  };

  function isMonitored(deviceCode) {
    var monitored = false;
    for (var i = 0; i < this._config.sensors.length; i++) {
      if (this._config.sensors[i].id === deviceCode) {
        monitored = true;
        break;
      }
    }
    return monitored;
  }

  function onPacketReceived(packet) {
    // Received a new packet - store it.
    var adapter = getAdapter(packet);
    if (typeof adapter !== "undefined") {
      var deviceCode = adapter.getDeviceCode().toLowerCase();

      if (isMonitored.call(this, deviceCode)) {
        var fs20Device = fs20Devices[deviceCode];
        var old = JSON.stringify(fs20Device.getServiceData());
        adapter.applyTo(fs20Device);

        console.log("received data: " + adapter.toString());

        var serviceData = fs20Device.getServiceData();
        var update = JSON.stringify(serviceData);

        if (old !== update) {
          console.log(deviceCode + " changed from: " + old + " to " + update);
          serviceData.timestamp = packet.timestamp;
          //serviceData.sensorId = deviceCode;
          this.emit("data", fs20Device.getConfig().feedId, serviceData);
        } else {
          console.log(deviceCode + " not changed at " + old);
        }
      }
    }
  }

  return FS20Driver;
}());
