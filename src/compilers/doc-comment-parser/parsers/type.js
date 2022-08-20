'use strict';

const Nife = require('nife');

const {
  createParser,
  parseTypes,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let targetType = this.types;
    let types;

    if (Nife.isNotEmpty(args.extra)) {
      let { types: _types } = parseTypes(args.extra);
      types = _types;
    } else if (targetType) {
      types = targetType.types;
    }

    return Nife.uniq((result['types'] || []).concat(types || []));
  },
  function(result) {
    let targetTypes = this.types;
    if (!targetTypes)
      return;

    return targetTypes.types || [];
  },
  'types',
  false,
);
