'use strict';

const Nife = require('nife');

const {
  createParser,
  parseTypes,
  parseDocCommentSection,
} = require('../parser-base');

module.exports = createParser(
  function(result, args) {
    let body = args.body;
    if (Nife.isEmpty(body))
      return;

    let lines             = body.split(/\n+/g);
    let parsedTypes       = parseDocCommentSection.call(this, {}, lines, /^\s*([\w\s]+):(.*)$/);
    let targetProperties  = this.properties || [];

    parsedTypes = Nife.arrayFlatten(Array.from(Object.values(parsedTypes)));

    parsedTypes = parsedTypes.map((arg, index) => {
      let targetArg   = targetProperties[index];
      let targetTypes = (targetArg && targetArg.types);

      let { types, assignment } = (!Nife.isEmpty(arg.extra)) ? parseTypes(arg.extra) : targetTypes;
      let isStatic = false;

      let name = arg.name.replace(/^static\s+/g, () => {
        isStatic = true;
        return '';
      });

      return {
        'static':       isStatic,
        'parentClass':  this,
        'type':         'PropertyDeclaration',
        'name':         name,
        'description':  arg.body,
        'types':        types || [],
        'assignment':   assignment || (targetArg && targetArg.assignment),
      };
    });

    return (result['properties'] || []).concat(parsedTypes);
  },
  function() {
    if (!this.genericType !== 'ClassDeclaration')
      return;

    if (Nife.isEmpty(this.properties))
      return;

    return this.properties.map((arg) => {
      return {
        type:         'PropertyDeclaration',
        name:         arg.name,
        description:  arg.description || '',
        types:        arg.types,
        assignment:   arg.assignment,
      };
    });
  },
);
