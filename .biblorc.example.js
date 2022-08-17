'use strict';

/* global __dirname */

const Path = require('path');

module.exports = {
  rootDir:    __dirname,
  inputDir:   Path.resolve(__dirname),
  outputDir:  Path.resolve(__dirname, '..', 'biblo.wiki'),
  files: [
    {
      include:  /\/src\/.*\.js$/,
      parser:   'typescript',
      compiler: 'typescript',
    },
    {
      include:  /\/docs\/.*\.md$/,
      parser:   'markdown',
      compiler: 'markdown',
    },
  ],
  exclude: [
    /node_modules|bin\/main\.js|colors\/|\/spec\//
  ],
  generatorOptions: {
    baseURL: './',
  },
};
