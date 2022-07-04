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

  const SK = Typescript.SyntaxKind;

  const adjustNodeStartPos = (node) => {
    if (node.kind < 0)
      return node;

    node.pos = node.getStart();
    node.end = node.getEnd();

    return node;
  };

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

  const searchForComment = (nodeIndex, direction) => {
    let stopNodes = [
      SK.ClassDeclaration,
      SK.FunctionDeclaration,
      SK.MethodDeclaration,
      SK.Constructor,
      SK.PropertyDeclaration,
    ];

    let count = 0;

    // eslint-disable-next-line semi-spacing
    for (let i = nodeIndex + direction, il = nodes.length;;) {
      if (i < 0 || i >= nodes.length)
        return;

      let node = nodes[i];
      if (stopNodes.indexOf(node.kind) >= 0)
        return;

      if (count > 10)
        return;

      if (node.kind < 0)
        return node;

      count++;
      i += direction;
    }
  };

  const assignFloatingCommentToArtifact = (artifact, direction = -1) => {
    let thisNodeIndex = getNodeIndexAtPosition(artifact.start, artifact.end);
    if (thisNodeIndex > 0) {
      let commentNode = searchForComment(thisNodeIndex, direction);
      if (commentNode)
        return Object.assign({}, artifact, { description: CompilerUtils.parseFloatingDescription(commentNode) });
    }

    return artifact;
  };

  const assignFloatingComments = (_artifacts) => {
    let artifacts = Nife.toArray(_artifacts);

    artifacts = artifacts.map((artifact) => {
      if (artifact.genericType !== 'FunctionDeclaration')
        return artifact;

      let args = artifact['arguments'].map((arg) => assignFloatingCommentToArtifact(arg));

      let returnNode = artifact['return'];
      if (returnNode)
        returnNode = assignFloatingCommentToArtifact(returnNode, 1);

      return assignFloatingCommentToArtifact(Object.assign({}, artifact, { 'arguments': args, 'return': returnNode }));
    });

    return (Array.isArray(_artifacts)) ? artifacts : artifacts[0];
  };

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
      parentClass.properties = node.members.filter((memberNode) => memberNode.kind === SK.PropertyDeclaration).map((_memberNode) => {
        let memberNode  = adjustNodeStartPos(_memberNode);
        let typeStr     = (memberNode.type) ? source.substring(memberNode.type.getFullStart(), memberNode.type.getFullStart() + memberNode.type.getFullWidth()) : undefined;

        return assignFloatingComments({
          'type':         'PropertyDeclaration',
          'genericType':  'PropertyDeclaration',
          'start':        memberNode.name.pos,
          'end':          memberNode.name.end,
          'name':         memberNode.name.escapedText,
          'types':        (typeStr) ? parseTypes(typeStr) : undefined,
          'parentClass':  parentClass,
        });
      });

      parentClass.methods = node.members
        .filter((memberNode) => (memberNode.kind === SK.Constructor || memberNode.kind === SK.MethodDeclaration))
        .map((memberNode) => buildFunctionDeclarationArtifact(memberNode, parentClass));

      artifacts = artifacts.concat(parentClass.properties, parentClass.methods);
    }

    return assignFloatingComments(parentClass);
  };

  const buildFunctionDeclarationArtifact = (_node, parentClass) => {
    let node  = adjustNodeStartPos(_node);

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

    const isStatic = () => {
      if (Nife.isNotEmpty(node.modifiers)) {
        for (let i = 0, il = node.modifiers.length; i < il; i++) {
          let modifier = node.modifiers[i];
          if (modifier.kind === SK.StaticKeyword)
            return true;
        }
      }

      return false;
    };

    const isGenerator = () => {
      return !!node.asteriskToken;
    };

    const getAccessLevel = () => {
      if (Nife.isNotEmpty(node.modifiers)) {
        for (let i = 0, il = node.modifiers.length; i < il; i++) {
          let modifier = node.modifiers[i];
          if (modifier.kind === SK.PrivateKeyword)
            return 'private';
          else if (modifier.kind === SK.ProtectedKeyword)
            return 'protected';
          else if (modifier.kind === SK.PublicKeyword)
            return 'public';
        }
      }

      return 'public';
    };

    let returnTypeStr = (node.type) ? source.substring(node.type.getStart(), node.type.getEnd()) : undefined;
    let isConstructor = false;
    let name;
    let returnNode;

    if (node.name) {
      name = node.name.escapedText;
    } else if (node.kind === SK.Constructor) {
      name = 'constructor';
      isConstructor = true;
    }

    if (returnTypeStr) {
      returnNode = assignFloatingComments({
        'type':         'Type',
        'genericType':  'Type',
        'start':        node.type.pos,
        'end':          node.type.end,
        'types':        parseTypes(returnTypeStr),
      });
    } else if (isConstructor) {
      returnNode = assignFloatingComments({
        'type':         'Type',
        'genericType':  'Type',
        'start':        node.pos,
        'end':          node.end,
        'types':        parseTypes(node.parent.name.escapedText),
      });
    }

    return assignFloatingComments({
      'fileName':               options.fileName,
      'relativeFileName':       CompilerUtils.getRelativeFileName(options.fileName, options),
      'sourceControlFileName':  CompilerUtils.getSourceControlFileName(options.fileName, options),
      'type':                   'FunctionDeclaration',
      'genericType':            'FunctionDeclaration',
      'start':                  node.pos,
      'end':                    node.end,
      'isConstructor':          isConstructor,
      'static':                 isStatic(),
      'name':                   name,
      'async':                  isAsync(),
      'generator':              isGenerator(),
      'access':                 getAccessLevel(),
      'parentClass':            parentClass,
      'arguments':              node.parameters.map((arg) => {
        let typeStr = (arg.type) ? source.substring(arg.type.getFullStart(), arg.type.getFullStart() + arg.type.getFullWidth()) : undefined;

        return assignFloatingComments({
          'type':         'Identifier',
          'genericType':  'Identifier',
          'start':        arg.name.pos,
          'end':          arg.name.end,
          'name':         arg.name.escapedText,
          'types':        (typeStr) ? parseTypes(typeStr) : undefined,
        });
      }),
      'return': returnNode,
    });
  };

  traverse(program, (node) => {
    nodes.push(adjustNodeStartPos(node));
  });

  nodes = CompilerUtils.sortArtifacts(nodes, 'pos');

  nodes.forEach((node) => {
    // console.log('Visiting ', Typescript.SyntaxKind[node.kind]);

    switch (node.kind) {
      case -1:
      case -2: {
        // comment
        artifacts.push({
          'fileName':               options.fileName,
          'relativeFileName':       CompilerUtils.getRelativeFileName(options.fileName, options),
          'sourceControlFileName':  CompilerUtils.getSourceControlFileName(options.fileName, options),
          'type':                   (node.kind === -2) ? 'CommentBlock' : 'CommentLine',
          'genericType':            'Comment',
          'start':                  node.pos,
          'end':                    node.end,
          'value':                  node.value,
        });

        break;
      }
      case SK.ClassDeclaration: {
        // console.log(`${Typescript.SyntaxKind[node.kind]}: `, Util.inspect(stripParents(node), { colors: true, depth: Infinity }));

        let classArtifact = buildClassDeclarationArtifact(node);
        artifacts.push(classArtifact);

        break;
      }
      case SK.MethodDeclaration:
      case SK.Constructor: {
        //console.log(`${Typescript.SyntaxKind[node.kind]}: `, Util.inspect(stripParents(node), { colors: true, depth: Infinity }));

        let parentClassName = node.parent.name.escapedText;
        let parentClass     = artifacts.find((artifact) => (artifact.type === 'ClassDeclaration' && artifact.name === parentClassName));
        let methodArtifact  = buildFunctionDeclarationArtifact(node, parentClass);

        artifacts.push(methodArtifact);

        break;
      }
      case SK.FunctionDeclaration: {
        // console.log(`${Typescript.SyntaxKind[node.kind]}: `, Util.inspect(stripParents(node), { colors: true, depth: Infinity }));

        artifacts.push(buildFunctionDeclarationArtifact(node));

        break;
      }
    }
  });

  // console.log('Nodes: ', nodes.map((node) => stripParents(node)));

  let comments = CompilerUtils.collectComments(source, artifacts.filter((artifact) => artifact.genericType === 'Comment'));
  artifacts = artifacts.filter((artifact) => artifact.genericType !== 'Comment');
  artifacts = comments.concat(artifacts);

  artifacts = CompilerUtils.collectCommentsIntoArtifacts(artifacts);
  artifacts = CompilerUtils.parseDocComments(artifacts);

  return artifacts;
}

module.exports = {
  compile,
};
