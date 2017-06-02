// Created by Ivan June 2017
module.exports = (function() {
  "use strict";
  const _ = require("lodash");

  class FS20Device {
    constructor(deviceCode, config, services) {
      this.device = deviceCode;
      this.config = config;
      this.services = services;
      this.data = {};
      this.dirty = false;
    }

    clearDirty() {
      this.dirty = false;
    }

    getConfig() {
      return this.config;
    }

    getData(lookup) {
      if (this.data[lookup]) {
        return this.data[lookup];
      } else {
        return 0;
      }
    }

    isDirty() {
      return this.dirty;
    }

    setData(lookup, val) {
      if (this.data[lookup] || this.data[lookup] !== val) {
        this.dirty = true;
        this.data[lookup] = val;
      }
    }

    setServiceData() {
      const serviceData = {};
      _.each(this.services, (service) => {
        if (this.services[service] && this.data[service]) {
          serviceData[this.services[service].name] = this.data[service];
        }
      });
      return serviceData;
    }
  }

  return FS20Device;
}());
