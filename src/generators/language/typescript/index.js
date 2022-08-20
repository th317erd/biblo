'use strict';

const Nife = require('nife');

function generateTypes(types) {
  if (Nife.isEmpty(types))
    return '';

  return types.join(' | ');
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

function generateClassPropertySignature(artifact, _options) {
  let options = _options || {};
  let parts   = [ artifact.static && 'static ', `property \`${artifact.parentClass.name}::${artifact.name}\`` ];

  let types = Nife.get(artifact, 'comment.definition.types');
  if (Nife.isNotEmpty(types))
    parts.push(`: \`${types.join(' | ')}\``);

  if (artifact.assignment)
    parts.push(` = \`${artifact.assignment}\``);

  return parts.filter(Boolean).join('');
}

function generateClassSignature(artifact, _options) {
  let options = _options || {};
  let parts   = [ `class \`${artifact.name}\`` ];

  if (artifact.extendsFromClass)
    parts.push(` extends \`${artifact.extendsFromClass}\``);

  return parts.join('');
}

function generateFunctionSignature(artifact, _options) {
  let options     = _options || {};
  let parts       = [ artifact.static && 'static ', (artifact.parentClass) ? `method \`${artifact.parentClass.name}::${artifact.name}\`` : `function \`${artifact.name}\``, '(' ];
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
    let typeStr = generateTypes(returnType.types.types);
    if (typeStr)
      parts.push(`: \`${typeStr}\``);
  }

  return parts.filter(Boolean).join('');
}

function generateArgumentSignature(artifact, _options) {
  let options = _options || {};
  let parts   = [ '`', artifact.name, '`' ];
  if (artifact.optional || Nife.isNotEmpty(artifact.assignment))
    parts.push('?');

  let typeStr = generateTypes(artifact.types);
  if (Nife.isNotEmpty(typeStr)) {
    parts.push(': ');
    parts.push(`\`${typeStr}\``);
  }

  if (artifact.assignment) {
    if (options.fullDescription) {
      parts.push(' ');
      parts.push(`*(Default: \`${artifact.assignment}\`)*`);
    } else {
      parts.push(` = \`${artifact.assignment}\``);
    }
  }

  return parts.join('');
}

function generateSignature(artifact, options) {
  if (artifact.type === 'FunctionDeclaration')
    return generateFunctionSignature(artifact, options);
  else if (artifact.type === 'FunctionArgument')
    return generateArgumentSignature(artifact, options);
  else if (artifact.type === 'ClassDeclaration')
    return generateClassSignature(artifact, options);
  else if (artifact.type === 'PropertyDeclaration')
    return generateClassPropertySignature(artifact, options);

  console.log(artifact);

  throw new Error(`Unsupported type: ${artifact.type}`);
}

module.exports = {
  generateArgumentSignature,
  generateDescription,
  generateFunctionSignature,
  generateSignature,
  generateTypes,
};
