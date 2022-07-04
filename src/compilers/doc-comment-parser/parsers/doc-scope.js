'use strict';

const Nife = require('nife');

const {
  createParser,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let docScope = args.extra;
    if (Nife.isEmpty(docScope))
      return 'global';

    return ('' + docScope).trim();
  },
  function(result) {
    return 'global';
  },
  'docScope',
  false,
);
