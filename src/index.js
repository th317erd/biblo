'use strict';

const FileSystem  = require('fs');
const Utils       = require('./utils');

async function compileString(string, options) {
  let result;

  let { parse, parseFile } = Utils.getParser(options);
  if (!parse) {
    if (parseFile)
      throw new Error('compileString: "parser" found, but parser only supports parsing files directly.');

    throw new Error('compileString: "parser" is required, but not found.');
  }

  let { compile } = Utils.getCompiler(options);
  if (!compile)
    throw new Error('compileString: "compiler" is required, but not found.');

  result = await Utils.runMiddleware(null, parse, { source: string, options });
  result = await Utils.runMiddleware('parseInput', null, result, options);
  result = await Utils.runMiddleware('transformInput', options && options.transformInput, result, options);

  return await compile(result, options);
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
  let { parse, parseFile } = Utils.getParser(options);
  if (parse) {
    let content = FileSystem.readFileSync(fullFileName, 'utf8');
    return await compileString(content, Object.assign({}, options, { fileName: fullFileName }));
  } else if (parseFile) {
    let result;

    let { compile } = Utils.getCompiler(options);
    if (!compile)
      throw new Error('compileString: "compiler" is required, but not found.');

    result = await Utils.runMiddleware(null, parseFile, { fileName: fullFileName, options });
    result = await Utils.runMiddleware('parseInput', null, result, options);
    result = await Utils.runMiddleware('transformInput', options && options.transformInput, result, options);

    return await compile(result, options);
  } else {
    throw new Error('compileString: "parser" is required, but not found.');
  }
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
