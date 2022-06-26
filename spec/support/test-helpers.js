'use strict';

/* global __dirname */

const Path        = require('path');
const FileSystem  = require('fs');

function loadTestFile(name) {
  let fullPath    = Path.resolve(__dirname, 'test-files', name);
  let configPath  = fullPath.replace(/\.(\w+)$/, '.config.js');
  let config;

  if (FileSystem.existsSync(configPath))
    config = require(configPath);

  return { content: FileSystem.readFileSync(fullPath, 'utf8'), config, path: fullPath };
}

module.exports = {
  loadTestFile,
};
