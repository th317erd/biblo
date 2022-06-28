'use strict';

const Nife          = require('nife');
const Typescript    = require('typescript');
const Utils         = require('../../utils');
const CompilerUtils = require('../compiler-utils');

function compile(parsed, options) {
  let parser    = (options && options.parser);
  let traverse  = (options && options.traverse);

  let {
    source,
    program,
  } = parsed;

  if (Nife.instanceOf(parser, 'string')) {
    parser = Utils.getParserByName(options.parser);
    if (parser && typeof parser.traverse === 'function')
      traverse = parser.traverse;
  } else if (parser && typeof parser.traverse === 'function') {
    traverse = parser.traverse;
  }

  if (typeof traverse !== 'function')
    throw new Error('compile: "traverse" function required, but not found.');

  let artifacts = [];

  traverse(program, (node) => {
    // console.log('Visiting ', Typescript.SyntaxKind[node.kind]);
    const SK = Typescript.SyntaxKind;

    switch (node.kind) {
      case -1:
        // comment
        artifacts.push({
          'type':         'CommentLine',
          'start':        node.pos,
          'end':          node.end,
          value:          node.value,
        });

        break;
      case SK.FunctionDeclaration:
        // console.log(node);

        artifacts.push({
          'type':         'FunctionDeclaration',
          'genericType':  'FunctionDeclaration',
          'start':        node.name.pos,
          'end':          node.end,
          'name':         node.name.escapedText,
          'arguments':    node.parameters.map((arg) => {
            return {
              'type':         'Identifier',
              'start':        arg.pos,
              'end':          arg.end,
              'name':         arg.name.escapedText,
            };
          }),
        });

        break;
    }
  });

  artifacts = CompilerUtils.sortArtifacts(artifacts);

  let comments = CompilerUtils.collectComments(source, artifacts.filter((artifact) => artifact.type === 'CommentLine'));
  if (Nife.isEmpty(comments))
    return [];

  artifacts = artifacts.filter((artifact) => artifact.type !== 'CommentLine');
  artifacts = comments.concat(artifacts);

  artifacts = CompilerUtils.collectArtifactsIntoComments(artifacts);
  artifacts = CompilerUtils.parseDocComments(artifacts);

  return artifacts;
}

module.exports = {
  compile,
};
