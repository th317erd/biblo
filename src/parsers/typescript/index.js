/* eslint-disable no-magic-numbers */
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
  const getComments = (sourceFileText, commentRanges) => {
    let comments = [];

    if (commentRanges && commentRanges.length) {
      commentRanges.forEach((range) => {
        let value = sourceFileText.slice(range.pos, range.end);
        let kind = -1;

        if (value.startsWith('//')) {
          kind = -1;
          value = value.substring(2);
        } else if (value.startsWith('/*')) {
          kind = -2;
          value = value.substring(2, value.length - 2);
        }

        comments.push({
          pos:  range.pos,
          end:  range.end,
          kind,
          value,
        });
      });
    }

    return comments;
  };

  const transformer = (context) => {
    let alreadySeenComments = {};

    return (rootNode) => {
      let sourceFileText = rootNode.getSourceFile().getFullText();

      function visit(node) {
        let comments = [].concat(
          getComments(sourceFileText, Typescript.getLeadingCommentRanges(sourceFileText, node.getFullStart())),
          getComments(sourceFileText, Typescript.getTrailingCommentRanges(sourceFileText, node.getFullStart())),
        );



        comments.filter((comment) => {
          let key = `${comment.pos}:${comment.end}`;
          if (alreadySeenComments[key])
            return false;

          alreadySeenComments[key] = true;

          return true;
        }).forEach((comment) => {
          visitor(comment);
        });

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
