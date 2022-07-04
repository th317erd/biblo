'use strict';

/* global __dirname */

const Path = require('path');

module.exports = {
  rootDir:    __dirname,
  inputDir:   Path.join(__dirname, 'src'),
  outputDir:  Path.join(__dirname, '..', 'biblo.wiki'),
  includePatterns: [
    /\/src\/.*js$/
  ],
  excludePatterns: [
    /node_modules|bin\/main\.js|colors\//
  ],
};
