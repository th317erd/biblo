'use strict';

const FileUtils   = require('./file-utils');
const FilterUtils = require('./filter-utils');
const MiscUtils   = require('./misc-utils');
const ConfigUtils = require('./config-utils');

module.exports = {
  collectPromises:        MiscUtils.collectPromises,
  constructConfig:        ConfigUtils.constructConfig,
  createFileNameFilter:   FilterUtils.createFileNameFilter,
  getCompiler:            ConfigUtils.getCompiler,
  getCompilerByName:      ConfigUtils.getCompilerByName,
  getGenerator:           ConfigUtils.getGenerator,
  getGeneratorByName:     ConfigUtils.getGeneratorByName,
  getParser:              ConfigUtils.getParser,
  getParserByName:        ConfigUtils.getParserByName,
  getRootDirsFromOptions: ConfigUtils.getRootDirsFromOptions,
  iterateFiles:           FileUtils.iterateFiles,
  runMiddleware:          MiscUtils.runMiddleware,
  walkFiles:              FileUtils.walkFiles,
};
