/* eslint-disable no-magic-numbers */
'use strict';

const Util          = require('util');
const Nife          = require('nife');
const Typescript    = require('typescript');
const Utils         = require('../../utils');
const CompilerUtils = require('../compiler-utils');

const {
  parseTypes,
} = require('../doc-comment-parser/parser-base');

function stripParents(node) {
  return Nife.extend(Nife.extend.DEEP | Nife.extend.FILTER | Nife.extend.INSTANCES, (key) => (key !== 'parent'), {}, node);
}

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
  let nodes     = [];

  const getNodeIndexAtPosition = (start, end) => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      let node = nodes[i];
      if (node.pos === start) {
        if (end && node.end !== end)
          continue;

        return i;
      }
    }

    return -1;
  };

  traverse(program, (node) => {
    // console.log('Visiting ', Typescript.SyntaxKind[node.kind]);
    const SK = Typescript.SyntaxKind;

    nodes.push(node);

    switch (node.kind) {
      case -1:
      case -2: {
        // comment
        artifacts.push({
          'type':         (node.kind === -2) ? 'CommentBlock' : 'CommentLine',
          'start':        node.pos,
          'end':          node.end,
          'value':        node.value,
        });

        break;
      }
      case SK.FunctionDeclaration: {
        // console.log('FunctionDeclaration: ', Util.inspect(stripParents(node), { colors: true, depth: Infinity }));
        let returnTypeStr = (node.type) ? source.substring(node.type.getFullStart(), node.type.getFullStart() + node.type.getFullWidth()) : undefined;

        artifacts.push({
          'type':         'FunctionDeclaration',
          'genericType':  'FunctionDeclaration',
          'start':        node.name.pos,
          'end':          node.end,
          'name':         node.name.escapedText,
          'arguments':    node.parameters.map((arg) => {
            let typeStr = (arg.type) ? source.substring(arg.type.getFullStart(), arg.type.getFullStart() + arg.type.getFullWidth()) : undefined;

            return {
              'type':         'Identifier',
              'genericType':  'Identifier',
              'start':        arg.name.pos,
              'end':          arg.name.end,
              'name':         arg.name.escapedText,
              'types':        (typeStr) ? parseTypes(typeStr) : undefined,
            };
          }),
          'return': (returnTypeStr) ? {
            'type':         'Type',
            'genericType':  'Type',
            'start':        node.type.getFullStart(),
            'end':          node.type.getFullStart() + node.type.getFullWidth(),
            'types':        parseTypes(returnTypeStr),
          } : undefined,
        });

        break;
      }
    }
  });

  nodes = CompilerUtils.sortArtifacts(nodes);

  // console.log('Nodes: ', nodes.map((node) => stripParents(node)));

  artifacts = CompilerUtils.sortArtifacts(artifacts);
  artifacts = artifacts.map((artifact) => {
    if (artifact.genericType !== 'FunctionDeclaration')
      return artifact;

    let args = artifact['arguments'].map((arg) => {
      let thisNodeIndex = getNodeIndexAtPosition(arg.start, arg.end);
      if (thisNodeIndex > 0) {
        let previousNode = nodes[thisNodeIndex - 1];
        if (previousNode.kind < 0)
          return Object.assign({}, arg, { description: CompilerUtils.parseFloatingDescription(previousNode) });
      }

      return arg;
    });

    let returnNode = artifact['return'];
    if (returnNode) {
      let thisNodeIndex = getNodeIndexAtPosition(returnNode.start, returnNode.end);
      if (thisNodeIndex >= 0) {
        let nextNode = nodes[thisNodeIndex + 1];
        if (nextNode.kind < 0)
          returnNode = Object.assign({}, returnNode, { description: CompilerUtils.parseFloatingDescription(nextNode) });
      }
    }

    return Object.assign({}, artifact, { 'arguments': args, 'return': returnNode });
  });

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
