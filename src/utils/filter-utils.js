'use strict';

const Nife  = require('nife');
const Path  = require('path');

function createFileNameFilter(_includePatterns, _excludePatterns) {
  let includePatterns = Nife.arrayFlatten(Nife.toArray(_includePatterns)).filter(Boolean);
  let excludePatterns = Nife.arrayFlatten(Nife.toArray(_excludePatterns)).filter(Boolean);

  return (_args) => {
    let result  = true;
    let args    = Object.assign({}, _args, { fullFileName: _args.fullFileName.replace(new RegExp(`${Path.sep}+`, 'g'), '/') });

    // Run include patterns first
    for (let i = 0, il = includePatterns.length; i < il; i++) {
      let pattern = includePatterns[i];

      if (typeof pattern === 'function')
        result = pattern(args);
      else if (pattern instanceof RegExp)
        result = pattern.test(args.fullFileName);
    }

    // Exclude patterns run second
    for (let i = 0, il = excludePatterns.length; i < il; i++) {
      let pattern = excludePatterns[i];

      if (typeof pattern === 'function')
        result = pattern(args);
      else if (pattern instanceof RegExp)
        result = pattern.test(args.fullFileName);
    }

    return result;
  };
}

module.exports = {
  createFileNameFilter,
};
