'use strict';

const Nife  = require('nife');
const Path  = require('path');

function createFileNameFilter(_includePatterns, _excludePatterns) {
  let includePatterns = Nife.arrayFlatten(Nife.toArray(_includePatterns)).filter(Boolean);
  let excludePatterns = Nife.arrayFlatten(Nife.toArray(_excludePatterns)).filter(Boolean);

  return (_args) => {
    let result  = true;
    let args    = Object.assign({}, _args, { fullFileName: _args.fullFileName.replace(new RegExp(`${Path.sep}+`, 'g'), '/') });

    if (args.excludeFiltersOnly !== true) {
      // Run include patterns first
      for (let i = 0, il = includePatterns.length; i < il; i++) {
        let pattern = includePatterns[i];
        let matchResult;

        if (typeof pattern === 'function')
          matchResult = pattern(args);
        else if (pattern instanceof RegExp)
          matchResult = pattern.test(args.fullFileName);

        if (matchResult) {
          result = true;
          break;
        }
      }
    }

    // Exclude patterns run second
    for (let i = 0, il = excludePatterns.length; i < il; i++) {
      let pattern = excludePatterns[i];
      let matchResult;

      if (typeof pattern === 'function')
        matchResult = pattern(args);
      else if (pattern instanceof RegExp)
        matchResult = pattern.test(args.fullFileName);

      if (matchResult) {
        result = false;
        break;
      }
    }

    return result;
  };
}

module.exports = {
  createFileNameFilter,
};
