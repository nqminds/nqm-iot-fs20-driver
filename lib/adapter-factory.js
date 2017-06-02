// Created by Ivan June 2017
module.exports = (function() {
  "use strict";

  const factory = function(packet) {
    let adapter;
    switch (packet.getHeader()) {
      case "T":
        const fhtAdapter = require("./adapters/fhtAdapter");
        adapter = new fhtAdapter(packet);
        break;
      case "E":
        const emAdapater = require("./adapters/emAdapter");
        adapter = new emAdapater(packet);
        break;
      case "K":
        const ashAdapter = require("./adapters/ashAdapter");
        adapter = new ashAdapter(packet);
        break;
      case "F":
        const pirAdapter = require("./adapters/pirAdapter");
        adapter = new pirAdapter(packet);
        break;
      default:
        // Do nothing, return null
        break;
    }
    return adapter;
  };

  return factory;
}());