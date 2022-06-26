'use strict';

const Nife          = require('nife');
const Utils         = require('../../utils');
const CompilerUtils = require('../compiler-utils');

function collectComments(source, comments) {
  let currentComment  = [];
  let finalComments   = [];
  let previousStart;
  let previousEnd;

  for (let i = 0, il = comments.length; i < il; i++) {
    let comment = comments[i];

    let {
      type,
      value,
      start,
      end,
    } = comment;

    if (type !== 'CommentLine')
      continue;

    if (previousEnd) {
      let chunk = source.substring(previousEnd, start);
      if (Nife.isNotEmpty(chunk)) {
        if (currentComment.length > 0) {
          finalComments.push({
            'type':   'DocComment',
            'start':  previousStart,
            'end':    previousEnd,
            'value':  currentComment.join('\n'),
          });
        }

        previousStart = null;
        currentComment = [];
      }
    }

    currentComment.push(value);

    if (!previousStart)
      previousStart = start;

    previousEnd = end;
  }

  if (currentComment.length > 0) {
    finalComments.push({
      'type':   'DocComment',
      'start':  previousStart,
      'end':    previousEnd,
      'value':  currentComment.join('\n'),
    });
  }

  return finalComments;
}

async function compile(parsed, options) {
  let parser    = (options && options.parser);
  let traverse  = (options && options.traverse);

  let {
    source,
    ast,
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


  let artifacts = collectComments(source, ast.comments);
  if (Nife.isEmpty(artifacts))
    return [];

  const parseArgumentDescription = (arg) => {
    let body = [].concat(
      arg.trailingComments,
      arg.leadingComments,
      arg.innerComments,
    );

    body = body
      .filter((comment) => {
        if (!comment)
          return false;

        if (comment.value.match(/^\//))
          return false;

        return true;
      })
      .map((comment) => comment.value.trim())
      .join(' ');

    return body;
  };

  traverse(ast, {
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
