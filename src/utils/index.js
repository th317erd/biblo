'use strict';

const FileUtils   = require('./file-utils');
const FilterUtils = require('./filter-utils');
const MiscUtils   = require('./misc-utils');

module.exports = {
  walkFiles:            FileUtils.walkFiles,
  iterateFiles:         FileUtils.iterateFiles,
  createFileNameFilter: FilterUtils.createFileNameFilter,
  collectPromises:      MiscUtils.collectPromises,
  runMiddleware:        MiscUtils.runMiddleware,
  getParserByName:      MiscUtils.getParserByName,
  getParser:            MiscUtils.getParser,
  getCompilerByName:    MiscUtils.getCompilerByName,
  getCompiler:          MiscUtils.getCompiler,
};
