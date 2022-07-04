'use strict';

module.exports = {
  'docscope':     require('./parsers/doc-scope.js'),
  'arguments':    require('./parsers/arguments.js'),
  'description':  require('./parsers/description.js'),
  'properties':   require('./parsers/properties.js'),
  'return':       require('./parsers/return.js'),
  'type':         require('./parsers/type.js'),
};
