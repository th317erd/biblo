'use strict';

const Path        = require('path');
const FileSystem  = require('fs');

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

module.exports = {
  walkFiles,
};
