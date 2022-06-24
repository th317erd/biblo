'use strict';

const Nife = require('nife');

function createFileNameFilter(_includePatterns, _excludePatterns) {
  let includePatterns = Nife.arrayFlatten(Nife.toArray(_includePatterns)).filter(Boolean);
  let excludePatterns = Nife.arrayFlatten(Nife.toArray(_excludePatterns)).filter(Boolean);

  return (args) => {
    let result = true;

    // Exclude patterns run first
    for (let i = 0, il = excludePatterns.length; i < il; i++) {
      let pattern = excludePatterns[i];

      if (typeof pattern === 'function') {
        let matchResult = pattern(args);
        if (matchResult === true) {
          result = false;
          break;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(args.fullFileName)) {
          result = false;
          break;
        }
      }
    }

    // Include runs after exclude
    for (let i = 0, il = includePatterns.length; i < il; i++) {
      let pattern = includePatterns[i];

      if (typeof pattern === 'function') {
        let matchResult = pattern(args);
        if (matchResult === false) {
          result = false;
          break;
        }
      } else if (pattern instanceof RegExp) {
        if (!pattern.test(args.fullFileName)) {
          result = false;
          break;
        }
      }
    }

    return result;
  };
}

module.exports = {
  createFileNameFilter,
};
