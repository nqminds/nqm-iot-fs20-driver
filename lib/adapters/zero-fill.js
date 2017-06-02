// Created by Ivan June 2017
module.exports = (function() {
  const zeroFill = function(number, width) {
    width -= number.toString().length;
    if (width > 0) {
      return new Array(width + (/\./.test( number ) ? 2 : 1) ).join("0") + number;
    } else {
      return number.toString();
    }
  };

  return zeroFill;
}());
