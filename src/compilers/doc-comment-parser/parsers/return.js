'use strict';

const Nife = require('nife');

const {
  createParser,
  parseTypes,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let targetReturn = this.target.return;
    let types;

    if (Nife.isNotEmpty(args.extra))
      types = parseTypes(args.extra);
    else if (targetReturn)
      types = targetReturn.types;

    delete args.extra;

    return Object.assign({}, args, { types: types || [] });
  },
  function(result) {
    let targetReturn = this.target['return'];
    if (!targetReturn)
      return;

    return {
      name:   'return',
      body:   targetReturn.description,
      types:  targetReturn.types,
    };
  },
);
