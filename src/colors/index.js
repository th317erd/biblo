'use strict';

const FAKE_INTERFACE = {
  red: (str) => str,
};

module.exports = function(options) {
  if (options && options.colors === false)
    return FAKE_INTERFACE;

  return require('colors/safe');
};
