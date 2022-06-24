'use strict';

const Path        = require('path');
const FileSystem  = require('fs');

const {
  createFileNameFilter,
} = require('./filter-utils');

function walkFiles(path, callback, _opts) {
  let opts    = _opts || {};
  let files   = FileSystem.readdirSync(path);
  let filter  = opts.filter;

  for (let i = 0, il = files.length; i < il; i++) {
    let fileName      = files[i];
    let fullFileName  = Path.join(path, fileName);
    let stats          = FileSystem.lstatSync(fullFileName);

    let filterResult = (typeof filter === 'function') ? filter({ fullFileName, fileName, stats, path }) : undefined;
    if (filterResult === false)
      continue;

    if (stats.isDirectory())
      walkFiles(fullFileName, callback, opts);
    else if (stats.isFile())
      callback({ fullFileName, fileName, stats, path });
  }
}

function iterateFiles(callback, options) {
  if (!options)
    throw new TypeError('iterateFiles: "options" argument is required.');

  let inputPath   = Path.resolve(options.input);
  let outputPath  = Path.resolve(options.output);
  let filter      = createFileNameFilter(options.includePatterns, options.excludePatterns);

  if (!FileSystem.existsSync(inputPath))
    throw new Error(`iterateFiles: Specified input path does't exist!: ${inputPath}`);

  let stats = FileSystem.statSync(inputPath);
  if (stats.isDirectory()) {
    walkFiles(inputPath, callback, { filter });
  } else {
    // single file
  }
}

module.exports = {
  walkFiles,
  iterateFiles,
};
