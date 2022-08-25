'use strict';

const Nife  = require('nife');
const Path  = require('path');

function parse({ source, options }, next) {
  let fileName  = Path.basename(options.fileName);
  let name      = Nife.capitalize(fileName.replace(/\.[^.]*$/, ''));

  return next({ source, program: [
    {
      start:    0,
      end:      source.length,
      type:     'Page',
      value:    source,
      docScope: name,
      name,
    },
  ], options });
}

function traverse(program) {
  return program;
}

module.exports = {
  parse,
  traverse,
};
