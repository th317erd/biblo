'use strict';

const Nife  = require('nife');
const Utils = require('../utils');

async function compile(ast, options) {
  let parser    = (options && options.parser);
  let traverse  = (options && options.traverse);
  let artifact;

  if (Nife.instanceOf(parser, 'string')) {
    parser = Utils.getParserByName(options.parser);
    if (parser && typeof parser.traverse === 'function')
      traverse = parser.traverse;
  } else if (parser && typeof parser.traverse === 'function') {
    traverse = parser.traverse;
  }

  if (typeof traverse !== 'function')
    throw new Error('compile: "traverse" function required, but not found.');

  traverse(ast, {
    FunctionDeclaration: function(path) {
      console.log('FUNCTION: ', path);
    },
  });
}

module.exports = {
  compile,
};
