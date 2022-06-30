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

    let lines       = body.split(/\n+/g);
    let parsedArgs  = parseDocCommentSection.call(this, {}, lines, /^\s*(\w+):(.*)$/);
    let targetArgs  = this.target.arguments;

    parsedArgs = Nife.arrayFlatten(Array.from(Object.values(parsedArgs)));

    parsedArgs = parsedArgs.map((arg, index) => {
      let targetArg   = targetArgs[index];
      let targetTypes = (targetArg && targetArg.types);

      let types = (!Nife.isEmpty(arg.extra)) ? parseTypes(arg.extra) : targetTypes;

      delete arg.extra;

      return Object.assign({}, arg, { types: types || [] });
    });

    return (result['arguments'] || []).concat(parsedArgs);
  },
  function() {
    let target = this.target;
    if (!target || target.genericType !== 'FunctionDeclaration')
      return;

    if (Nife.isEmpty(target.arguments))
      return;

    return target.arguments.map((arg) => {
      return {
        name:   arg.name,
        body:   arg.description || '',
        types:  arg.types,
      };
    });
  },
);
