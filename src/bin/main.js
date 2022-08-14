'use strict';

/* global process */

const Nife                = require('nife');
const janap               = require('janap');
const Path                = require('path');
const FileSystem          = require('fs');
const { constructConfig } = require('../utils');
const { compileFiles }    = require('../index');

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

  let options = constructConfig(args);

  if (Nife.isEmpty(options.inputDir))
    exitWithHelp();

  if (Nife.isEmpty(options.outputDir))
    exitWithHelp();

  if (Nife.isEmpty(options.rootDir))
    exitWithHelp();

  if (Nife.isEmpty(options.files))
    exitWithHelp();

  options.inputDir   = Path.resolve(options.inputDir);
  options.outputDir  = Path.resolve(options.outputDir);
  options.rootDir    = Path.resolve(options.rootDir);

  if (!FileSystem.existsSync(options.inputDir)) {
    console.error(`Specified input directory "${options.inputDir}" does not exist.`);
    process.exit(1);
  }

  if (!FileSystem.existsSync(options.outputDir)) {
    console.error(`Specified output directory "${options.outputDir}" does not exist.`);
    process.exit(1);
  }

  if (!FileSystem.existsSync(options.rootDir)) {
    console.error(`Specified root directory "${options.rootDir}" does not exist.`);
    process.exit(1);
  }

  // console.log('OPTIONS: ', options);

  let artifacts = await compileFiles(options);
  let {
    layout: layoutGenerator,
  } = options.generator;

  await layoutGenerator(artifacts, options);
})();
