import { registerHelper } from './helper.js';

export const JavascriptHelper = registerHelper({
  pattern:  /\.([cm]?js|tsx?)$/i,
  callback: ({ source, scope, block }) => {
    let sub = source.substring(block.end, block.nextBlock && block.nextBlock.start);

    sub.replace(/[\s\r\n]*(export\s+)?(?:let|var|const\s*=\s*)?(function|class)\s*([\w$]+)?/, (m, e, type, name) => {
      if (e)
        scope.exported = true;

      scope.type = (type === 'function') ? 'Function' : 'Class';

      if (name)
        scope.name = name;

      return m;
    });

    return scope;
  },
});
