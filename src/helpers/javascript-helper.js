import { registerHelper } from './helper.js';

export const JavascriptHelper = registerHelper({
  pattern:  /\.([cm]?js|tsx?)$/i,
  callback: ({ source, scope, block }) => {
    let sub = source.substring(block.end, block.nextBlock && block.nextBlock.start);

    sub.replace(/[\s\r\n]*(export\s+)?(?:let|var|const\s*=\s*)?(function|class)\s*([\w$]+)?(?:\s+extends\s+([\w$]+))?/, (m, e, type, name, parentName) => {
      if (e)
        scope.exported = true;

      scope.type = (type === 'function') ? 'Function' : 'Class';

      if (name)
        scope.name = name;

      if (scope.type === 'Class' && parentName)
        scope.extends = parentName;

      return m;
    });

    return scope;
  },
});
