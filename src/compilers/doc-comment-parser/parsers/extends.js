'use strict';

const {
  createParser,
} = require('../parser-base');

module.exports = createParser(
  function(_, args) {
    return (args.extra || '').trim();
  },
  null,
  'extends',
  false,
);
