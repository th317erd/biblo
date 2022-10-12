'use strict';

const {
  createParser,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let isStatic = false;

    let altName = args.extra.replace(/\.static\s+/, () => {
      isStatic = true;
      return '.';
    });

    return (result['see'] || []).concat({
      'static':   isStatic,
      'type':     'SeeAlso',
      'name':     args.extra,
      'altName':  altName,
    });
  },
  null,
  'see',
);
