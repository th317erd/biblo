'use strict';

const FileSystem  = require('fs');
const Utils       = require('./utils');

async function compileString(string, _options) {
  let options = Utils.constructConfig(_options);
  let result;

  result = await Utils.runMiddleware('transformInput', options && options.transformInput, { source: string, options }, options);
  result = await Utils.runMiddleware(null, options.parser.parse, result);
  result = await Utils.runMiddleware('transformAST', options && options.transformAST, result, options);

  return await options.compiler.compile(result, options);
}

async function compileStrings(strings, _options) {
  let options   = Utils.constructConfig(_options);
  let artifacts = strings.map((string) => {
    if (!string)
      return;

    return compileString(string, options);
  });

  return await Utils.collectPromises(artifacts);
}

async function compileFile(fullFileName, _options) {
  let options = Utils.constructConfig(_options);
  let content = FileSystem.readFileSync(fullFileName, 'utf8');

  return await compileString(content, Object.assign({}, options, { fileName: fullFileName }));
}

async function compileFiles(_options) {
  let options   = Utils.constructConfig(_options);
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
