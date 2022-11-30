'use strict';

const Nife = require('nife');

const {
  LanguageGeneratorBase,
} = require('../../base');

class TypeScriptLanguageGenerator extends LanguageGeneratorBase {
  getLanguageType() {
    return 'typescript';
  }

  generateTypes(context, types) {
    if (Nife.isEmpty(types))
      return '';

    return types.map((type) => this.onGenerateType(context, type)).join(' | ');
  }

  generateDescription(context, artifact) {
    if (!artifact)
      return '';

    if (typeof artifact === 'string')
      return artifact;

    let description = Nife.get(artifact, 'comment.definition.description.body', artifact.description);
    if (!description)
      return '';

    return description;
  }

  generateClassPropertySignature(context, artifact, _options) {
    let options = _options || {};
    let parts   = [ artifact.static && 'static ', `property \`${(artifact.parentClass && artifact.parentClass.name) ? `${artifact.parentClass.name}::` : ''}${artifact.name}\`` ];

    let types = Nife.get(artifact, 'comment.definition.types', (artifact.types && artifact.types.types || artifact.types));
    if (Nife.isNotEmpty(types))
      parts.push(`: \`${types.join(' | ')}\``);

    if (artifact.assignment)
      parts.push(` = \`${artifact.assignment}\``);

    return parts.filter(Boolean).join('');
  }

  generateClassSignature(context, artifact, _options) {
    let options = _options || {};
    let parts   = [ `class \`${artifact.name}\`` ];

    let extendsFrom = Nife.get(artifact, 'comment.definition.extends', (artifact.extendsFromClass) ? `\`${artifact.extendsFromClass}\`` : '');
    if (extendsFrom)
      parts.push(` extends ${extendsFrom}`);

    return parts.join('');
  }

  generateFunctionSignature(context, artifact, _options) {
    let options     = _options || {};
    let name        = artifact.name.split(/\W/g).pop();
    let parts       = [ artifact.static && 'static ', (artifact.parentClass) ? `method \`${artifact.parentClass.name}::${name}\`` : `function \`${name}\``, '(' ];
    let args        = Nife.get(artifact, 'comment.definition.arguments');
    let outputArgs  = [];

    if (Nife.isEmpty(args))
      args = artifact['arguments'];

    if (Nife.isNotEmpty(args)) {
      for (let i = 0, il = args.length; i < il; i++) {
        let arg = args[i];
        outputArgs.push(this.generateArgumentSignature(context, arg));
      }
    }

    if (Nife.isNotEmpty(outputArgs))
      parts.push(outputArgs.join(', '));

    parts.push(')');

    let returnType = Nife.get(artifact, 'comment.definition.return');
    if (Nife.isEmpty(returnType))
      returnType = artifact['return'];

    if (returnType) {
      let typeStr = this.generateTypes(context, returnType.types.types || returnType.types);
      if (typeStr)
        parts.push(`: ${typeStr}`);
    }

    return parts.filter(Boolean).join('');
  }

  generateArgumentSignature(context, artifact, _options) {
    let options = _options || {};
    let parts   = [ '`', artifact.name, '`' ];
    if (artifact.optional || Nife.isNotEmpty(artifact.assignment))
      parts.push('?');

    let typeStr = this.generateTypes(context, artifact.types);
    if (Nife.isNotEmpty(typeStr)) {
      parts.push(': ');
      parts.push(typeStr);
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

  generateSignature(context, artifact, options) {
    if (artifact.type === 'FunctionDeclaration')
      return this.generateFunctionSignature(context, artifact, options);
    else if (artifact.type === 'FunctionArgument')
      return this.generateArgumentSignature(context, artifact, options);
    else if (artifact.type === 'ClassDeclaration')
      return this.generateClassSignature(context, artifact, options);
    else if (artifact.type === 'PropertyDeclaration')
      return this.generateClassPropertySignature(context, artifact, options);

    console.log(artifact);

    throw new Error(`Unsupported type: ${artifact.type}`);
  }
}

module.exports = TypeScriptLanguageGenerator;
