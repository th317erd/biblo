'use strict';

const Nife = require('nife');

const {
  createParser,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let body = args.body;

    if (result.description) {
      if (Nife.isNotEmpty(body))
        body = `${result.description.body}\n${body}`;
    }

    delete args.extra;

    return Object.assign({}, args, { body });
  },
);
