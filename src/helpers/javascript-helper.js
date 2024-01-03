import { registerHelper } from './helper.js';

export const JavascriptHelper = registerHelper({
  pattern:  /\.([cm]?js|tsx?)$/i,
  callback: ({ source, scope, block }) => {
    let sub = source.substring(block.end, block.nextBlock && block.nextBlock.start);

    sub.replace(/[\s\r\n]*(export\s+)?(?:let|var|const\s*=\s*)?(function\s*|class\s+)([\w$]+)?(?:\s+extends\s+([\w$]+))?/, (m, e, _type, name, parentName) => {
      let type = _type.trim();
      if (e)
        scope.exported = true;

      scope.type = (type === 'function') ? 'Function' : 'Class';

      if (name)
        scope.name = name;

      if (scope.type === 'Class' && parentName)
        scope.extends = parentName;

      return m;
    }).replace(/([a-zA-Z$_][\w$]*?)\s*\([^)]*?\)\s*\{/, (m, name) => {
      if (name && !(/^(function|catch)$/).test(name)) {
        scope.type = 'Function';
        scope.name = name;
      }

      return m;
    });

    return scope;
  },
});
