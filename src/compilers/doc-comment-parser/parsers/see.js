'use strict';

const {
  createParser,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    return (result['see'] || []).concat({
      type:         'SeeAlso',
      name:         args.extra,
    });
  },
  null,
  'see',
);
