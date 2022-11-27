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
    let parsedArgs  = parseDocCommentSection.call(this,
      {},
      lines,
      /^\s*([\w$.]+)\s*(\?)?\s*:(.*)$/,
      null,
      (name, optional, extra) => {
        return { name: name.trim(), extra: extra.trim(), optional: (optional === '?') };
      },
    );

    let targetArgs = this.arguments || [];

    parsedArgs = Nife.arrayFlatten(Array.from(Object.values(parsedArgs)));

    parsedArgs = parsedArgs.map((arg, index) => {
      let targetArg   = targetArgs[index];
      let targetTypes = (targetArg && targetArg.types);

      let { types, assignment } = ((!Nife.isEmpty(arg.extra)) ? parseTypes(arg.extra) : targetTypes) || {};

      return {
        type:         'FunctionArgument',
        name:         arg.name,
        description:  arg.body,
        optional:     arg.optional,
        types:        types || [],
        assignment:   assignment || (targetArg && targetArg.assignment),
      };
    }).filter(Boolean);

    return (result['arguments'] || []).concat(parsedArgs);
  },
  function() {
    if (this.genericType !== 'FunctionDeclaration')
      return [];

    if (Nife.isEmpty(this.arguments))
      return [];

    return this.arguments.map((arg) => {
      return {
        type:         'FunctionArgument',
        name:         arg.name,
        description:  arg.description || '',
        types:        arg.types,
        assignment:   arg.assignment,
      };
    });
  },
);
