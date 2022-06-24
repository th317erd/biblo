'use strict';

const babel         = require('@babel/core');
const babelTraverse = require('@babel/traverse').default;

function parse({ source, options }, next) {
  let babelOptions = (options && options.parserOptions);
  let ast = babel.parseSync(source, babelOptions);

  return next(ast);
}

function traverse(ast, callbacks) {
  babelTraverse(ast, callbacks);
}

module.exports = {
  parse,
  traverse,
};
