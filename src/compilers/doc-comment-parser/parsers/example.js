'use strict';

const Nife = require('nife');

const {
  createParser,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let { body, extra } = args;

    let note = `${extra || ''}${body || ''}`.trim();
    if (Nife.isEmpty(note))
      return (result['examples'] || []);

    return (result['examples'] || []).concat(note);
  },
  null,
  'examples',
);
