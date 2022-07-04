'use strict';

/* global process */

const Nife                = require('nife');
const janap               = require('janap');
const Path                = require('path');
const FileSystem          = require('fs');
const { constructConfig } = require('./utils');
const { compileFiles }    = require('../src/index');

const HELP_CONTENT = `
Usage: biblo -i {input directory} -o {output directory} -r {root directory}
  input options:
    -i, --inputDir: Specify input directory for finding files
    -p, --parser: Specify parser name or module path ("babel", or "typescript")
    -c, --compiler: Specify compiler name or module path ("babel", or "typescript")
  output options:
    -o, --outputDir: Specify output directory to place generated files

`;

(async function() {
  const exitWithHelp = () => {
    console.log(HELP_CONTENT);
    process.exit(1);
  };

  const args = janap.parse(process.argv, {
    _alias: {
      'i': 'inputDir',
      'o': 'outputDir',
      'r': 'rootDir',
      'p': 'parser',
      'c': 'compiler',
    },
    'inputDir':   String,
    'outputDir':  String,
    'rootDir':    String,
    'parser':     String,
    'compiler':   String,
  });

  if (Nife.isEmpty(args.inputDir))
    exitWithHelp();

  if (Nife.isEmpty(args.outputDir))
    exitWithHelp();

  if (Nife.isEmpty(args.rootDir))
    exitWithHelp();

  args.inputDir   = Path.resolve(args.inputDir);
  args.outputDir  = Path.resolve(args.outputDir);
  args.rootDir    = Path.resolve(args.rootDir);

  if (!FileSystem.existsSync(args.inputDir)) {
    console.error(`Specified input directory "${args.inputDir}" does not exist.`);
    process.exit(1);
  }

  if (!FileSystem.existsSync(args.outputDir)) {
    console.error(`Specified output directory "${args.outputDir}" does not exist.`);
    process.exit(1);
  }

  if (!FileSystem.existsSync(args.rootDir)) {
    console.error(`Specified root directory "${args.rootDir}" does not exist.`);
    process.exit(1);
  }

  let options = constructConfig(args);
  await compileFiles(options);
})();
