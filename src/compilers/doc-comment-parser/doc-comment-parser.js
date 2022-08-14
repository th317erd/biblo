'use strict';

module.exports = {
  'arguments':    require('./parsers/arguments.js'),
  'description':  require('./parsers/description.js'),
  'docscope':     require('./parsers/doc-scope.js'),
  'properties':   require('./parsers/properties.js'),
  'return':       require('./parsers/return.js'),
  'see':          require('./parsers/see.js'),
  'type':         require('./parsers/type.js'),
};
