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
import { parsePath }        from '../parser.js';
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

let args = CMDed(({ $, store, fetch }) => {
  const makeArray = (items) => {
    return ((Array.isArray(items)) ? items : [ items ]).filter(Boolean);
  };

  $('--root', Types.STRING(), { format: Path.resolve }) || store('root', process.cwd());

  let configPath = Utils.findFileBackwards(fetch('root'), '.biblo.yaml');
  $('--config', Types.STRING(), { format: Path.resolve }) || store('config', configPath);

  configPath = fetch('config');
  if (FileSystem.existsSync(configPath)) {
    let config = YAML.parse(FileSystem.readFileSync(configPath, 'utf8'));
    config.root     = Path.resolve(config.root);
    config.output   = Path.resolve(config.output);
    config.include  = makeArray(config.include);
    config.exclude  = makeArray(config.exclude);

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

(async function(args) {
  let config = args._config || {};

  delete args._config;

  if (config.helpers)
    registerHelpers(config.helpers);

  let data = await parsePath({
    ...config,
    ...args,
  });

  console.log('DATA: ', Util.inspect(data, { depth: Infinity, colors: true }));

  FileSystem.mkdirSync(Path.dirname(args.output), { recursive: true });
  FileSystem.writeFileSync(args.output, JSON.stringify(data), 'utf8');

  console.log(`Successfully built "${args.output}"`);
})(args);
