'use strict';

const {
  createParser,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    return (result['see'] || []).concat({
      type:         'See',
      name:         args.extra,
    });
  },
  null,
  'see',
);
