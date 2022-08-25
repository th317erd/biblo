'use strict';

/* global process, __dirname */

const Nife        = require('nife');
const Path        = require('path');
const FileSystem  = require('fs');

function getEngineName(name) {
  if (name.charAt(0) === '/')
    return name;

  return ('' + name).replace(/[^\w_.-]+/g, '').replace(/\.+/g, '.');
}

function getParserByName(_name) {
  let name = getEngineName(_name);

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
  } else if (parser && typeof parser.parse === 'function' && typeof parser.traverse === 'function') {
    return parser;
  } else if (typeof parser === 'function' && typeof options.traverse === 'function') {
    return {
      traverse: options.traverse,
      parser,
    };
  }

  return {};
}

function getCompilerByName(_name) {
  let name = getEngineName(_name);

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
  if (!_name)
    return;

  let name = getEngineName(_name);
  if (name === 'babel')
    name = 'typescript';

  try {
    return require(Path.resolve(__dirname, '..', 'generators', type, name));
  } catch (error) {
    console.error(error);
    return;
  }
}

function getGenerator(options) {
  let generator = ((options && options.generator) || {});

  if (typeof generator.layout === 'function' && typeof generator.language === 'function') {
    return generator;
  } else if (typeof generator === 'function') {
    return {
      layout: generator,
    };
  } else if (typeof generator === 'string') {
    generator = {
      layout:   getGeneratorByName('layout', generator),
      language: getGeneratorByName('language', generator),
    };

    if (typeof generator.layout === 'function')
      return generator;
  } else if (typeof generator.layout === 'string') {
    generator = {
      layout:   getGeneratorByName('layout', generator.layout),
      language: getGeneratorByName('language', generator.language),
    };

    if (typeof generator.layout === 'function')
      return generator;
  }

  let parser = (options && options.parser);
  if (Nife.instanceOf(parser, 'string')) {
    generator = {
      layout:   getGeneratorByName('layout', parser),
      language: getGeneratorByName('language', parser),
    };

    if (typeof generator.layout === 'function')
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

function constructConfig(_options) {
  if (_options && _options._built === true)
    return _options;

  let options = Nife.extend(
    true,
    {
      generator:  {
        layout:   'github-wiki',
        language: 'typescript',
      },
    },
    getRootDirsFromOptions(_options),
    _options || {},
  );

  let rootDir = options.rootDir;

  let bibloRCPath = Path.join(rootDir, '.biblorc.js');
  if (FileSystem.existsSync(bibloRCPath)) {
    try {
      let bibloRC = require(bibloRCPath);
      options = Nife.extend(true, {
        inputDir: Path.dirname(bibloRCPath),
      }, options, bibloRC);
    } catch (error) {
      console.error(`Error while attempting to load Biblo config "${bibloRCPath}": `, error);
      throw error;
    }
  }

  let files = options.files;
  if (Nife.isEmpty(files))
    throw new Error('constructConfig: "files" is required, but not found.');

  for (let i = 0, il = files.length; i < il; i++) {
    let fileGroup = files[i];
    let parser    = getParser(fileGroup);
    let compiler  = getCompiler(fileGroup);

    fileGroup.parser    = parser;
    fileGroup.compiler  = compiler;

    if (!fileGroup.parser || !fileGroup.parser.parse || !fileGroup.parser.traverse)
      throw new Error(`constructConfig: "files[${i}].parser" is required, but not found.`);

    if (!fileGroup.compiler || !fileGroup.compiler.compile)
      throw new Error(`constructConfig: "files[${i}].compiler" is required, but not found.`);
  }

  let generator = getGenerator(options);
  options.generator = generator;

  if (!options.generator || !options.generator.layout)
    throw new Error('constructConfig: "generator" is required, but not found.');

  options._built = true;

  return options;
}

module.exports = {
  getCompiler,
  getCompilerByName,
  getGenerator,
  getGeneratorByName,
  getParser,
  getParserByName,
  getRootDirsFromOptions,
  constructConfig,
};
