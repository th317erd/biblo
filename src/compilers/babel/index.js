/* eslint-disable key-spacing */
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
      arg.leadingComments,
      arg.innerComments,
    );

    return CompilerUtils.parseFloatingDescription(body);
  };

  const getDefaultValueFromNode = (node) => {
    if (node.type === 'NullLiteral')
      return 'null';

    return ('' + node.value);
  };

  const getTypeFromNode = (node) => {
    if (node.type === 'NumericLiteral')
      return 'number';

    if (node.type === 'StringLiteral')
      return 'string';

    if (node.type === 'BooleanLiteral')
      return 'boolean';

    if (node.type === 'BigIntLiteral' || (node.type === 'CallExpression' && node.callee.name === 'BigInt'))
      return 'bigint';

    return;
  };

  const buildClassDeclarationArtifact = (node) => {
    return {
      'fileName':               options.fileName,
      'relativeFileName':       CompilerUtils.getRelativeFileName(options.fileName, options),
      'sourceControlFileName':  CompilerUtils.getSourceControlFileName(options.fileName, options),
      'type':                   'ClassDeclaration',
      'genericType':            'ClassDeclaration',
      'start':                  node.start,
      'end':                    node.end,
      'name':                   node.id.name,
      'properties':             [],
      'methods':                [],
    };
  };

  const buildFunctionDeclarationArtifact = (node, parentClass) => {
    let isConstructor = false;
    let name;
    let returnNode;

    if (node.id) {
      name = node.id.name;
    } else if (node.kind === 'constructor') {
      name = 'constructor';
      isConstructor = true;

      if (parentClass) {
        returnNode = {
          'type':         'Type',
          'genericType':  'Type',
          'start':        node.start,
          'end':          node.end,
          'types':        [ parentClass.name ],
        };
      }
    }

    return {
      'fileName':               options.fileName,
      'relativeFileName':       CompilerUtils.getRelativeFileName(options.fileName, options),
      'sourceControlFileName':  CompilerUtils.getSourceControlFileName(options.fileName, options),
      'type':                   'FunctionDeclaration',
      'genericType':            'FunctionDeclaration',
      'start':                  node.start,
      'end':                    node.end,
      'name':                   name,
      'static':                 node.static,
      'async':                  node.async,
      'generator':              node.generator,
      'access':                 node.access,
      'isConstructor':          isConstructor,
      'parentClass':            parentClass,
      'return':                 returnNode,
      'arguments':              node.params.map((arg) => {
        return {
          'type':         'Identifier',
          'start':        arg.start,
          'end':          arg.end,
          'name':         arg.name,
          'description':  parseArgumentDescription(arg),
        };
      }),
    };
  };

  const buildPropertyDeclarationArtifact = (node, parentClass) => {
    return {
      'type':                   'PropertyDeclaration',
      'genericType':            'PropertyDeclaration',
      'start':                  node.start,
      'end':                    node.end,
      'name':                   node.key.name || node.key.id.name,
      'static':                 node.static,
      'access':                 (node.type === 'ClassPrivateProperty') ? 'private' : 'public',
      'types':                  [ getTypeFromNode(node.value) ].filter(Boolean),
      'defaultValue':           getDefaultValueFromNode(node.value),
      'parentClass':            parentClass,
      'description':            parseArgumentDescription(node),
    };
  };

  function handleClassMethod(path) {
    let parentClassName = path.parentPath.parentPath.node.id.name;
    let parentClass     = artifacts.find((artifact) => (artifact.type === 'ClassDeclaration' && artifact.name === parentClassName));
    let methodArtifact  = buildFunctionDeclarationArtifact(path.node, parentClass);

    if (parentClass)
      parentClass.methods.push(methodArtifact);

    artifacts.push(methodArtifact);
  }

  function handleClassProperty(path) {
    let parentClassName   = path.parentPath.parentPath.node.id.name;
    let parentClass       = artifacts.find((artifact) => (artifact.type === 'ClassDeclaration' && artifact.name === parentClassName));
    let propertyArtifact  = buildPropertyDeclarationArtifact(path.node, parentClass);

    if (parentClass)
      parentClass.properties.push(propertyArtifact);

    // console.log('CLASS PROPERTY: ', parentClassName, path.node);
    artifacts.push(propertyArtifact);
  }

  traverse(program, {
    ArrowFunctionExpression: function(path) {
      // artifacts.push(path.node);
    },
    ClassDeclaration:         function(path) {
      artifacts.push(buildClassDeclarationArtifact(path.node));
    },
    ClassMethod: handleClassMethod,
    ClassPrivateMethod: handleClassMethod,
    ClassProperty: handleClassProperty,
    ClassPrivateProperty: handleClassProperty,
    FunctionDeclaration: function(path) {
      artifacts.push(buildFunctionDeclarationArtifact(path.node));
    },
    FunctionExpression: function(path) {
      artifacts.push(buildFunctionDeclarationArtifact(path.node));
    },
    ObjectMethod: function(path) {
      // artifacts.push(path.node);
    },
    VariableDeclaration: function(path) {
      // artifacts.push(path.node);
    },
  });

  artifacts = CompilerUtils.collectCommentsIntoArtifacts(artifacts);
  artifacts = CompilerUtils.parseDocComments(artifacts);

  return artifacts;
}

module.exports = {
  compile,
};
