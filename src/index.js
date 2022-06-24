'use strict';

const Nife        = require('nife');
const FileSystem  = require('fs');
const { compile } = require('./compiler');
const Utils       = require('./utils');

async function compileString(string, options) {
  let parser = (options && options.parser);
  let result;

  if (Nife.instanceOf(parser, 'string')) {
    parser = Utils.getParserByName(options.parser);
    if (parser)
      result = await Utils.runMiddleware(null, parser.parse, { source: string, options });
  } else if (parser && typeof parser.parse === 'function') {
    result = await Utils.runMiddleware(null, parser.parse, { source: string, options });
  } else if (typeof parser === 'function') {
    result = await Utils.runMiddleware(null, parser, { source: string, options });
  }

  result = await Utils.runMiddleware('parseInput', null, result, options);
  result = await Utils.runMiddleware('transformInput', options && options.transformInput, result, options);

  return compile(result, options);
}

async function compileStrings(strings, options) {
  let artifacts = strings.map((string) => {
    if (!string)
      return;

    return compileString(string, options);
  });

  return await Utils.collectPromises(artifacts);
}

async function compileFile(fullFileName, options) {
  let content   = FileSystem.readFileSync(fullFileName, 'utf8');
  let artifact  = await compileString(content, options);
  return artifact;
}

async function compileFiles(options) {
  if (!options)
    throw new TypeError('compile: "options" argument is required.');

  let artifacts = [];

  Utils.iterateFiles(({ fullFileName }) => {
    artifacts.push(compileFile(fullFileName, options));
  }, options);

  return await Utils.collectPromises(artifacts);
}

module.exports = {
  Utils,
  compileString,
  compileStrings,
  compileFile,
  compileFiles,
};
