'use strict';

module.exports = {
  'alias':        require('./parsers/alias.js'),
  'arguments':    require('./parsers/arguments.js'),
  'description':  require('./parsers/description.js'),
  'docscope':     require('./parsers/doc-scope.js'),
  'note':         require('./parsers/note.js'),
  'properties':   require('./parsers/properties.js'),
  'return':       require('./parsers/return.js'),
  'see':          require('./parsers/see.js'),
  'type':         require('./parsers/type.js'),
};
