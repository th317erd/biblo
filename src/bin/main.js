#!/usr/bin/env node

import {
  CMDed,
  Types,
} from 'cmded';

import Util                 from 'node:util';
import Path                 from 'node:path';
import FileSystem           from 'node:fs';
import YAML                 from 'yaml';
import * as Utils           from '../utils/index.js';
import * as Parser          from '../parser.js';
import { registerHelpers }  from '../helpers/helper.js';

const help = {
  '@usage':    'biblo [options] --output ./docs.json',
  '@examples': [
    './biblo --root=./src --include=**/lib/*.js --output ./docs.json',
  ],
  '--root':         'Specify root directory to start searching for files',
  '--config':       'Load a config file (.biblo.yaml is searched for automatically)',
  '--include':      'An array of glob patterns for files to include in parsing',
  '--exclude':      'An array of glob patterns for files to ignore',
  '--output':       'A path to an output file',
  '--outputFormat': 'Output file format: "yaml" or "json" (default "json")',
};

const configFileNames = [
  '.biblo.js',
  '.biblo.mjs',
  '.biblo.cjs',
  '.biblo.yaml',
  '.biblo.json',
];

function makeArray(items) {
  return ((Array.isArray(items)) ? items : [ items ]).filter(Boolean);
}

async function loadConfigFile(configPath) {
  let config = {};

  if ((/\.yaml$/i).test(configPath)) {
    config = YAML.parse(FileSystem.readFileSync(configPath, 'utf8'));
  } else if ((/\.json$/i).test(configPath)) {
    config = Utils.loadJSON(configPath);
  } else {
    config = await import(configPath);
    if (config && config.default)
      config = config.default;
  }

  config.root     = Path.resolve(config.root);
  config.output   = Path.resolve(config.output);
  config.include  = makeArray(config.include);
  config.exclude  = makeArray(config.exclude);

  return config;
}

(async function() {
  let args = await CMDed(async ({ $, store, fetch }) => {
    $('--root', Types.STRING(), { format: Path.resolve }) || store('root', process.cwd());

    let configPath;
    for (let configFileName of configFileNames) {
      configPath = Utils.findFileBackwards(fetch('root'), configFileName);
      if (configPath)
        break;
    }

    $('--config', Types.STRING(), { format: Path.resolve }) || store('config', configPath);

    configPath = fetch('config');
    if (FileSystem.existsSync(configPath)) {
      let config = await loadConfigFile(configPath);

      store(config);
      store('_config', config);
    } else {
      store('_config', {});
    }

    $('--output', Types.STRING(), { format: Path.resolve });
    $('--include', Types.STRING());
    $('--exclude', Types.STRING());
    $('--outputFormat', Types.STRING()) || store('outputFormat', 'json');

    return (
      Utils.notNOE(fetch('output'))
      && Utils.notNOE(fetch('include'))
    );
  }, { help });

  if (!args)
    return;

  let config = args._config || {};

  delete args._config;

  if (config.helpers)
    registerHelpers(config.helpers);

  let data = await Parser.parsePath({
    ...config,
    ...args,
  });

  if (typeof config.postProcess === 'function')
    data = config.postProcess({ data, config, args, Utils, Parser });

  console.log('DATA: ', Util.inspect(data, { depth: Infinity, colors: true }));

  FileSystem.mkdirSync(Path.dirname(args.output), { recursive: true });
  FileSystem.writeFileSync(args.output, JSON.stringify(data), 'utf8');

  console.log(`Successfully built "${args.output}"`);
})();
