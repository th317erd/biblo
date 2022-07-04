'use strict';

const FileUtils   = require('./file-utils');
const FilterUtils = require('./filter-utils');
const MiscUtils   = require('./misc-utils');

module.exports = {
  collectPromises:        MiscUtils.collectPromises,
  createFileNameFilter:   FilterUtils.createFileNameFilter,
  getCompiler:            MiscUtils.getCompiler,
  getCompilerByName:      MiscUtils.getCompilerByName,
  getGenerator:           MiscUtils.getGenerator,
  getGeneratorByName:     MiscUtils.getGeneratorByName,
  getParser:              MiscUtils.getParser,
  getParserByName:        MiscUtils.getParserByName,
  getRootDirsFromOptions: MiscUtils.getRootDirsFromOptions,
  iterateFiles:           FileUtils.iterateFiles,
  runMiddleware:          MiscUtils.runMiddleware,
  walkFiles:              FileUtils.walkFiles,
};
