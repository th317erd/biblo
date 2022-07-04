'use strict';

const Nife = require('nife');

function generateTypes(types) {
  if (Nife.isEmpty(types))
    return '';

  return types.join(' | ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateDescription(artifact) {
  if (!artifact)
    return '';

  if (typeof artifact === 'string')
    return artifact;

  let description = Nife.get(artifact, 'comment.definition.description.body', artifact.description);
  if (!description)
    return '';

  return description;
}

function generateFunctionSignature(artifact) {
  let parts       = [ (artifact.parentClass) ? `\`${artifact.parentClass.name}::${artifact.name}\`` : `function \`${artifact.name}\``, '(' ];
  let args        = Nife.get(artifact, 'comment.definition.arguments');
  let outputArgs  = [];

  if (Nife.isEmpty(args))
    args = artifact['arguments'];

  if (Nife.isNotEmpty(args)) {
    for (let i = 0, il = args.length; i < il; i++) {
      let arg = args[i];
      outputArgs.push(generateArgumentSignature(arg));
    }
  }

  if (Nife.isNotEmpty(outputArgs))
    parts.push(outputArgs.join(', '));

  parts.push(')');

  let returnType = Nife.get(artifact, 'comment.definition.return');
  if (Nife.isEmpty(returnType))
    returnType = artifact['return'];

  if (returnType) {
    let typeStr = generateTypes(returnType.types);
    if (typeStr)
      parts.push(`: ${typeStr}`);
  }

  return parts.join('');
}

function generateArgumentSignature(artifact) {
  let parts = [ '`', artifact.name, '`' ];
  if (artifact.optional)
    parts.push('?');

  let typeStr = generateTypes(artifact.types);
  if (Nife.isNotEmpty(typeStr)) {
    parts.push(': ');
    parts.push(typeStr);
  }

  return parts.join('');
}

function generateSignature(artifact) {
  if (artifact.type === 'FunctionDeclaration')
    return generateFunctionSignature(artifact);
  else if (artifact.type === 'FunctionArgument')
    return generateArgumentSignature(artifact);

  throw new Error(`Unsupported type: ${artifact.type}`);
}

module.exports = {
  generateArgumentSignature,
  generateDescription,
  generateFunctionSignature,
  generateSignature,
  generateTypes,
};
