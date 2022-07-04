'use strict';

/* global __dirname, process */

const Nife  = require('nife');
const Path  = require('path');

async function collectPromises(_promises, options) {
  const colors  = require('../colors')(options);
  let errors    = [];
  let promises  = (await Promise.allSettled(_promises)).map((result) => {
    if (result.status !== 'fulfilled') {
      if (options && options.logger)
        options.logger.error(colors.red(result.reason));

      errors.push(result.reason);
      return;
    }

    return result.value;
  });

  if (errors.length > 0) {
    if (options && options.logger)
      options.logger.log((options && options.errorMessage) ? options.errorMessage : 'collectPromises: There were errors encountered. Aborting.');

    let error = new Error((options && options.errorMessage) ? options.errorMessage : 'collectPromises: There were errors encountered. Aborting.');
    error.errors = errors;

    throw error;
  }

  return promises;
}

async function runMiddleware(type, callback, data, options) {
  const runMiddleware = (middleware, initialResult) => {
    return new Promise((resolve, reject) => {
      const next = async (index, result) => {
        if (index >= middleware.length)
          return result;

        let plugin = middleware[index];
        if (typeof plugin !== 'function')
          return await next(index + 1, result);

        let finalResult;
        let nextCalled = false;
        let returnedResult = await plugin(result, async (result) => {
          nextCalled = true;
          finalResult = next(index + 1, result);
        });

        if (nextCalled)
          return await finalResult;

        return returnedResult;
      };

      next(0, initialResult)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  let result = data;

  if (options && options.middleware && options.middleware[type]) {
    let middleware = options.middleware[type];
    result = await runMiddleware(middleware, result);
  }

  if (typeof callback === 'function')
    result = await runMiddleware([ callback ], result);

  return result;
}

function getParserByName(_name) {
  let name = ('' + _name).replace(/[^\w_.-]+/g, '').replace(/\.+/g, '.');

  try {
    return require(Path.resolve(__dirname, `../parsers/${name}`));
  } catch (error) {
    return;
  }
}

function getParser(options) {
  let parser = (options && options.parser);
  if (Nife.instanceOf(parser, 'string')) {
    parser = getParserByName(options.parser);
    if (parser)
      return parser;
  } else if (parser && typeof parser.parse === 'function') {
    return parser;
  } else if (typeof parser === 'function') {
    return {
      traverse: options.traverse,
      parser,
    };
  }

  return {};
}

function getCompilerByName(_name) {
  let name = ('' + _name).replace(/[^\w_.-]+/g, '').replace(/\.+/g, '.');

  try {
    return require(Path.resolve(__dirname, `../compilers/${name}`));
  } catch (error) {
    console.error(error);
    return;
  }
}

function getCompiler(options) {
  let compiler = (options && options.compiler);
  if (compiler && typeof compiler.compile === 'function') {
    return compiler;
  } else if (typeof compiler === 'function') {
    return {
      compile: compiler,
    };
  }

  let parser = (options && options.parser);
  if (Nife.instanceOf(parser, 'string')) {
    compiler = getCompilerByName(options.parser);
    if (compiler)
      return compiler;
  }

  return {};
}

function getGeneratorByName(type, _name) {
  let name = ('' + _name).replace(/[^\w_.-]+/g, '').replace(/\.+/g, '.');

  if (name === 'babel')
    name = 'typescript';

  try {
    return require(Path.resolve(__dirname, '..', 'generators', type, name));
  } catch (error) {
    console.error(error);
    return;
  }
}

function getGenerator(type, options) {
  let generator = (options && options.generator && options.generator[type]);
  if (generator && typeof generator.generate === 'function') {
    return generator;
  } else if (typeof generator === 'function') {
    return {
      generate: generator,
    };
  } else if (typeof generator === 'string') {
    generator = getGeneratorByName(generator);
    if (generator)
      return generator;
  }

  let parser = (options && options.parser);
  if (Nife.instanceOf(parser, 'string')) {
    generator = getGeneratorByName(options.parser);
    if (generator)
      return generator;
  }

  return {};
}

function getRootDirsFromOptions(options) {
  let rootDir;
  let sourceControlRootDir;

  if (options) {
    rootDir = options.rootDir;
    sourceControlRootDir = options.sourceControlRootDir;
  }

  if (Nife.isEmpty(rootDir))
    rootDir = process.cwd();

  if (Nife.isEmpty(sourceControlRootDir))
    sourceControlRootDir = rootDir;

  return {
    rootDir,
    sourceControlRootDir,
  };
}

module.exports = {
  collectPromises,
  getCompiler,
  getCompilerByName,
  getGenerator,
  getGeneratorByName,
  getParser,
  getParserByName,
  getRootDirsFromOptions,
  runMiddleware,
};
