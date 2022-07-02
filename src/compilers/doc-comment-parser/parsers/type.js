'use strict';

const Nife = require('nife');

const {
  createParser,
  parseTypes,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let targetType = this.target.types;
    let types;

    if (Nife.isNotEmpty(args.extra))
      types = parseTypes(args.extra);
    else if (targetType)
      types = targetType.types;

    delete args.extra;

    return Nife.uniq((result['types'] || []).concat(types || []));
  },
  function(result) {
    let targetTypes = this.target['types'];
    if (!targetTypes)
      return;

    return targetTypes.types || [];
  },
  'types',
);
