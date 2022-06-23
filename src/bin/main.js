'use strict';

/* global process */

const Nife          = require('nife');
const janap         = require('janap');
const Path          = require('path');
const FileSystem    = require('fs');
const { walkFiles } = require('./utils');

const HELP_CONTENT = `
Usage: vue-to-react -i {input folder} -o {output folder}
`;

(function() {
  const args = janap.parse(process.argv, {
    _alias: {
      'i': 'input',
      'o': 'output',
    },
    'input':  String,
    'output': String,
  });


})();
