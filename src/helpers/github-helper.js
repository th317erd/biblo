import { registerHelper } from './helper.js';

export const GitHubHelper = registerHelper({
  pattern:  /./i,
  callback: ({ scope }) => {
    if (scope.filePath && scope.repo && scope.repo.startsWith('https://github.com'))
      scope.repoLink = `${scope.repo}/blob/main/${scope.filePath}`;

    return scope;
  },
});
