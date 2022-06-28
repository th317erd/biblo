'use strict';

const Typescript = require('typescript');

function getOptions(options) {
  let typescriptOptions = (options && options.parserOptions);

  return Object.assign({
    options: {
      allowJs:              true,
      maxNodeModuleJsDepth: 1024,
      removeComments:       false,
    },
  }, typescriptOptions || {});
}

function parse({ source, options }, next) {
  let program = Typescript.createSourceFile(
    options.fileName,
    source,
    Typescript.ScriptTarget.ES2015,
    /*setParentNodes */ true,
  );

  return next({ source, program, options });
}

function traverse(program, visitor) {
  const transformer = (context) => {
    return (rootNode) => {
      let sourceFileText = rootNode.getSourceFile().getFullText();

      function visit(node) {
        let commentRanges = Typescript.getLeadingCommentRanges(sourceFileText, node.getFullStart());
        if (commentRanges && commentRanges.length) {
          commentRanges.forEach((range) => {
            let value = sourceFileText.slice(range.pos, range.end);

            if (value.startsWith('//'))
              value = value.substring(2);
            else if (value.startsWith('/*'))
              value = value.substring(2, value.length - 2);

            visitor({
              pos:  range.pos,
              end:  range.end,
              kind: -1,
              value,
            });
          });
        }

        visitor(node);

        return Typescript.visitEachChild(node, visit, context);
      }

      return Typescript.visitNode(rootNode, visit);
    };
  };

  let result = Typescript.transform(
    program,
    [ transformer ],
    getOptions().options,
  );
}

module.exports = {
  parse,
  traverse,
};
