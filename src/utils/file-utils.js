'use strict';

const Nife        = require('nife');
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
    let stats         = FileSystem.lstatSync(fullFileName);

    if (fileName.charAt(0) === '.')
      continue;

    if (stats.isDirectory()) {
      let filterResult = (typeof filter === 'function') ? filter({ fullFileName, fileName, stats, path, excludeFiltersOnly: true }) : undefined;
      if (filterResult === false)
        continue;

      walkFiles(fullFileName, callback, opts);
    } else if (stats.isFile()) {
      let filterResult = (typeof filter === 'function') ? filter({ fullFileName, fileName, stats, path }) : undefined;
      if (filterResult === false)
        continue;

      callback({ fullFileName, fileName, stats, path });
    }
  }
}

function iterateFiles(callback, options) {
  if (!options)
    throw new TypeError('iterateFiles: "options" argument is required.');

  let inputPath = Path.resolve(options.inputDir);
  if (!FileSystem.existsSync(inputPath))
    throw new Error(`iterateFiles: Specified input path does't exist!: ${inputPath}`);

  let files = options.files;
  if (Nife.isEmpty(files))
    throw new Error('iterateFiles: "files" is a required configuration parameter.');

  for (let i = 0, il = files.length; i < il; i++) {
    let fileGroup     = files[i];
    let localOptions  = Object.assign({}, options, fileGroup, { files: null });
    let localFilter   = createFileNameFilter(
      (options.include || []).concat(fileGroup.include || []),
      (options.exclude || []).concat(fileGroup.exclude || [])
    );

    walkFiles(inputPath, (args) => {
      if (args.fileName === '.biblorc.js')
        return;

      callback(Object.assign({}, args, { options: localOptions }));
    }, { filter: localFilter });
  }
}

module.exports = {
  walkFiles,
  iterateFiles,
};
