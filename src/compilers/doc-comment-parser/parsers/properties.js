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
    let parsedTypes       = parseDocCommentSection.call(this, {}, lines, /^\s*(\w+):(.*)$/);
    let targetProperties  = this.target.properties || [];

    parsedTypes = Nife.arrayFlatten(Array.from(Object.values(parsedTypes)));

    parsedTypes = parsedTypes.map((arg, index) => {
      let targetArg   = targetProperties[index];
      let targetTypes = (targetArg && targetArg.types);

      let types = (!Nife.isEmpty(arg.extra)) ? parseTypes(arg.extra) : targetTypes;

      delete arg.extra;

      return {
        name:         arg.name,
        description:  arg.body,
        types:        types || [],
      };
    });

    return (result['properties'] || []).concat(parsedTypes);
  },
  function() {
    let target = this.target;
    if (!target || target.genericType !== 'ClassDeclaration')
      return;

    if (Nife.isEmpty(target.properties))
      return;

    return target.properties.map((arg) => {
      return {
        name:         arg.name,
        description:  arg.description || '',
        types:        arg.types,
      };
    });
  },
);
