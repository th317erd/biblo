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

function compile(parsed, _options) {
  let options   = _options || {};
  let parser    = options.parser;
  let traverse  = options.traverse;

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

  const SK = Typescript.SyntaxKind;

  const buildClassDeclarationArtifact = (node) => {
    let parentClass = {
      'fileName':               options.fileName,
      'relativeFileName':       CompilerUtils.getRelativeFileName(options.fileName, options),
      'sourceControlFileName':  CompilerUtils.getSourceControlFileName(options.fileName, options),
      'type':                   'ClassDeclaration',
      'genericType':            'ClassDeclaration',
      'start':                  node.name.pos,
      'end':                    node.end,
      'name':                   node.name.escapedText,
    };

    if (node.members) {
      parentClass.properties = node.members.filter((memberNode) => memberNode.kind === SK.PropertyDeclaration).map((memberNode) => {
        let typeStr = (memberNode.type) ? source.substring(memberNode.type.getFullStart(), memberNode.type.getFullStart() + memberNode.type.getFullWidth()) : undefined;

        return {
          'type':         'Identifier',
          'genericType':  'Identifier',
          'start':        memberNode.name.pos,
          'end':          memberNode.name.end,
          'name':         memberNode.name.escapedText,
          'types':        (typeStr) ? parseTypes(typeStr) : undefined,
          'parentClass':  parentClass,
        };
      });

      parentClass.methods = node.members
        .filter((memberNode) => (memberNode.kind === SK.Constructor))
        .map((memberNode) => buildFunctionDeclarationArtifact(memberNode, parentClass));
    }

    return parentClass;
  };

  const buildFunctionDeclarationArtifact = (node, parentClass) => {
    const isAsync = () => {
      if (Nife.isNotEmpty(node.modifiers)) {
        for (let i = 0, il = node.modifiers.length; i < il; i++) {
          let modifier = node.modifiers[i];
          if (modifier.kind === SK.AsyncKeyword)
            return true;
        }
      }

      return false;
    };

    const isGenerator = () => {
      return !!node.asteriskToken;
    };

    let returnTypeStr = (node.type) ? source.substring(node.type.getFullStart(), node.type.getFullStart() + node.type.getFullWidth()) : undefined;
    let isConstructor = false;
    let start;
    let name;
    let returnNode;

    if (node.name) {
      name = node.name.escapedText;
    } else if (node.kind === SK.Constructor) {
      name = 'constructor';
      isConstructor = true;
    }

    if (returnTypeStr) {
      returnNode = {
        'type':         'Type',
        'genericType':  'Type',
        'start':        node.type.getFullStart(),
        'end':          node.type.getFullStart() + node.type.getFullWidth(),
        'types':        parseTypes(returnTypeStr),
      };
    } else if (isConstructor) {
      returnNode = {
        'type':         'Type',
        'genericType':  'Type',
        'start':        node.pos,
        'end':          node.end,
        'types':        parseTypes(node.parent.name.escapedText),
      };
    }

    start = node.parameters.pos - name.length;

    return {
      'fileName':               options.fileName,
      'relativeFileName':       CompilerUtils.getRelativeFileName(options.fileName, options),
      'sourceControlFileName':  CompilerUtils.getSourceControlFileName(options.fileName, options),
      'type':                   'FunctionDeclaration',
      'genericType':            'FunctionDeclaration',
      'start':                  start,
      'end':                    node.end,
      'isConstructor':          isConstructor,
      'name':                   name,
      'async':                  isAsync(),
      'generator':              isGenerator(),
      'parentClass':            parentClass,
      'arguments':              node.parameters.map((arg) => {
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
      'return': returnNode,
    };
  };

  traverse(program, (node) => {
    // console.log('Visiting ', Typescript.SyntaxKind[node.kind]);
    nodes.push(node);

    switch (node.kind) {
      case -1:
      case -2: {
        // comment
        artifacts.push({
          'fileName':               options.fileName,
          'relativeFileName':       CompilerUtils.getRelativeFileName(options.fileName, options),
          'sourceControlFileName':  CompilerUtils.getSourceControlFileName(options.fileName, options),
          'type':                   (node.kind === -2) ? 'CommentBlock' : 'CommentLine',
          'start':                  node.pos,
          'end':                    node.end,
          'value':                  node.value,
        });

        break;
      }
      case SK.ClassDeclaration: {
        // console.log(`${Typescript.SyntaxKind[node.kind]}: `, Util.inspect(stripParents(node), { colors: true, depth: Infinity }));
        artifacts.push(buildClassDeclarationArtifact(node));

        break;
      }
      case SK.Constructor: {
        // console.log(`${Typescript.SyntaxKind[node.kind]}: `, Util.inspect(stripParents(node), { colors: true, depth: Infinity }));

        let parentClassName = node.parent.name.escapedText;
        let parentClass     = artifacts.find((artifact) => (artifact.type === 'ClassDeclaration' && artifact.name === parentClassName));

        artifacts.push(buildFunctionDeclarationArtifact(node, parentClass));

        break;
      }
      case SK.FunctionDeclaration: {
        console.log(`${Typescript.SyntaxKind[node.kind]}: `, Util.inspect(stripParents(node), { colors: true, depth: Infinity }));

        artifacts.push(buildFunctionDeclarationArtifact(node));

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
