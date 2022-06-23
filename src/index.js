'use strict';

/* global process */

const Nife          = require('nife');
const Path          = require('path');
const FileSystem    = require('fs');
const { walkFiles } = require('./utils');

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

function iterateFiles(callback, options) {
  if (!options)
    throw new TypeError('iterateFiles: "options" argument is required.');

  let inputPath   = Path.resolve(options.input);
  let outputPath  = Path.resolve(options.output);
  let filter      = createFileNameFilter(options.includePatterns, options.excludePatterns);

  if (!FileSystem.existsSync(inputPath)) {
    console.error('Specified input path does\'t exist!');
    process.exit(1);
  }

  let stats = FileSystem.statSync(inputPath);
  if (stats.isDirectory()) {
    walkFiles(inputPath, callback, { filter });
  } else {
    // single file
  }
}

async function compileFile(fullFileName, options) {

}

async function compile(options) {
  if (!options)
    throw new TypeError('compile: "options" argument is required.');

  let artifacts = [];

  iterateFiles(({ fullFileName }) => {
    artifacts.push(compileFile(fullFileName, options));
  }, options);

  let errors = [];

  artifacts = await Promise.allSettled(artifacts);
  artifacts = artifacts.map((result) => {
    if (result.status !== 'fulfilled') {
      if (options.logger)
        options.logger.error(result.reason);

      errors.push(result.reason);
      return;
    }

    return result.value;
  }).filter(Boolean);

  if (errors.length > 0) {
    if (options.logger)
      options.logger.log('compile: There were errors encountered. Aborting.');

    let error = new Error('Errors encountered during compile');
    error.errors = errors;

    throw error;
  }

  return artifacts;
}

module.exports = {
  compile,
};
