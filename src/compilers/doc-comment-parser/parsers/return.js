'use strict';

const Nife = require('nife');

const {
  createParser,
  parseTypes,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let targetReturn = this['return'];
    let types;

    if (Nife.isNotEmpty(args.extra))
      types = parseTypes(args.extra);
    else if (targetReturn)
      types = targetReturn.types;

    delete args.extra;

    return {
      name:         args.name,
      description:  args.body,
      types:        types || [],
    };
  },
  function(result) {
    let targetReturn = this['return'];
    if (!targetReturn)
      return;

    return {
      name:         'return',
      description:  targetReturn.description,
      types:        targetReturn.types,
    };
  },
);
