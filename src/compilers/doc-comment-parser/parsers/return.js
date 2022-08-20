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

    if (Nife.isNotEmpty(args.extra)) {
      let result = parseTypes(args.extra);
      types = result.types;
    } else if (targetReturn) {
      types = targetReturn.types;
    }

    return {
      type:         'ReturnType',
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
      type:         'ReturnType',
      name:         'return',
      description:  targetReturn.description,
      types:        targetReturn.types,
    };
  },
);
