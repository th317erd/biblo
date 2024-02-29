import { registerScopeHelper } from './scope-helper.js';

export const GitHubScopeHelper = registerScopeHelper({
  matches:  true,
  exec:     ({ scope }) => {
    if (scope.fullFileName && scope.repo && scope.repo.startsWith('https://github.com'))
      scope.repoLink = `${scope.repo}/blob/main/${scope.fullFileName}`;

    return scope;
  },
});
