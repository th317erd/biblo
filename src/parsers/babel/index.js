'use strict';

const babel         = require('@babel/core');
const babelTraverse = require('@babel/traverse').default;

function parse({ source, options }, next) {
  let babelOptions  = (options && options.parserOptions);
  let result        = babel.transformSync(
    source,
    Object.assign(
      {
        filename:       options.fileName,
        sourceFileName: options.fileName,
        sourceMaps:     'inline',
      },
      babelOptions || {},
      {
        ast: true,
      },
    ),
  );

  return next({ source, program: result.ast, options });
}

function traverse(program, callbacks) {
  babelTraverse(program, callbacks);
}

module.exports = {
  parse,
  traverse,
};
