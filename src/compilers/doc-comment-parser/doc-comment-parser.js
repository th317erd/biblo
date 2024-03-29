'use strict';

module.exports = {
  'alias':        require('./parsers/alias.js'),
  'arguments':    require('./parsers/arguments.js'),
  'description':  require('./parsers/description.js'),
  'docscope':     require('./parsers/doc-scope.js'),
  'example':      require('./parsers/example.js'),
  'extends':      require('./parsers/extends.js'),
  'interface':    require('./parsers/interface.js'),
  'note':         require('./parsers/note.js'),
  'properties':   require('./parsers/properties.js'),
  'return':       require('./parsers/return.js'),
  'see':          require('./parsers/see.js'),
  'syntaxtype':   require('./parsers/syntax-type.js'),
  'type':         require('./parsers/type.js'),
};
