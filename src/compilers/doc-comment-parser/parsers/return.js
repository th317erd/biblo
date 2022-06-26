'use strict';

const {
  createParser,
  parseTypes,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let types = parseTypes(args.extra);

    delete args.extra;

    return Object.assign({}, args, { types });
  },
);
