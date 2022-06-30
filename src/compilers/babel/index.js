'use strict';

const Nife          = require('nife');
const Utils         = require('../../utils');
const CompilerUtils = require('../compiler-utils');

async function compile(parsed, options) {
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

  let artifacts = CompilerUtils.collectComments(source, program.comments);
  if (Nife.isEmpty(artifacts))
    return [];

  const parseArgumentDescription = (arg) => {
    let body = [].concat(
      arg.trailingComments,
      arg.leadingComments,
      arg.innerComments,
    );

    return CompilerUtils.parseFloatingDescription(body);
  };

  traverse(program, {
    ArrowFunctionExpression: function(path) {
      artifacts.push(path.node);
    },
    DeclareClass: function(path) {
      artifacts.push(path.node);
    },
    DeclareFunction: function(path) {
      artifacts.push(path.node);
    },
    DeclareInterface: function(path) {
      artifacts.push(path.node);
    },
    DeclareModule: function(path) {
      artifacts.push(path.node);
    },
    DeclareTypeAlias: function(path) {
      artifacts.push(path.node);
    },
    DeclareVariable: function(path) {
      artifacts.push(path.node);
    },
    ClassDeclaration: function(path) {
      artifacts.push(path.node);
    },
    ClassMethod: function(path) {
      artifacts.push(path.node);
    },
    ClassProperty: function(path) {
      artifacts.push(path.node);
    },
    FunctionDeclaration: function(path) {
      let node = path.node;

      // console.log(node);

      artifacts.push({
        'type':         'FunctionDeclaration',
        'genericType':  'FunctionDeclaration',
        'start':        node.start,
        'end':          node.end,
        'name':         node.id.name,
        'arguments':    node.params.map((arg) => {
          return {
            'type':         'Identifier',
            'start':        arg.start,
            'end':          arg.end,
            'name':         arg.name,
            'description':  parseArgumentDescription(arg),
          };
        }),
      });
    },
    FunctionExpression: function(path) {
      let node = path.node;
      artifacts.push({
        'type':         'FunctionDeclaration',
        'genericType':  'FunctionDeclaration',
        'start':        node.start,
        'end':          node.end,
        'name':         node.id.name,
        'arguments':    node.params.map((arg) => {
          return {
            'type':         'Identifier',
            'start':        arg.start,
            'end':          arg.end,
            'name':         arg.name,
            'description':  parseArgumentDescription(arg),
          };
        }),
      });
    },
    ObjectMethod: function(path) {
      artifacts.push(path.node);
    },
    VariableDeclaration: function(path) {
      artifacts.push(path.node);
    },
  });

  artifacts = CompilerUtils.collectArtifactsIntoComments(artifacts);
  artifacts = CompilerUtils.parseDocComments(artifacts);

  return artifacts;
}

module.exports = {
  compile,
};