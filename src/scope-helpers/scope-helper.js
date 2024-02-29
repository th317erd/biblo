import * as Utils from '../utils/index.js';

const REGISTERED_BLOCK_HELPERS = [];

export class ScopeHelper {
  constructor(options) {
    if (!options)
      throw new TypeError('ScopeHelper(constructor): "options" is required to create a "ScopeHelper" instance.');

    if (Utils.isNOE(options.matches))
      throw new Error('ScopeHelper(constructor): "options.matches" is required to register a scope helper.');

    if (Utils.isNOE(options.exec))
      throw new Error('ScopeHelper(constructor): "options.exec" is required to register a scope helper.');

    Object.defineProperties(this, {
      'matchesPattern': {
        writable:     false,
        enumerable:   false,
        configurable: false,
        value:        options.matches,
      },
      'callback': {
        writable:     false,
        enumerable:   false,
        configurable: false,
        value:        options.exec,
      },
    });
  }

  matches(fullFileName) {
    if (Utils.isType(this.matchesPattern, 'Boolean'))
      return this.matchesPattern;
    else if (Utils.isType(this.matchesPattern, 'RegExp'))
      return this.matchesPattern.test(fullFileName);
    else if (Utils.isType(this.matchesPattern, 'Function'))
      return this.matchesPattern(fullFileName);
  }

  exec(...args) {
    return this.callback(...args);
  }
}

export function registerScopeHelper(helperObj) {
  let helper = (helperObj instanceof ScopeHelper) ? helperObj : new ScopeHelper(helperObj);

  REGISTERED_BLOCK_HELPERS.unshift(helper);

  return helper;
}

export function registerScopeHelpers(helpers) {
  if (!helpers)
    return [];

  if (Array.isArray(helpers)) {
    return helpers.reverse().map((helperObj) => registerScopeHelper(helperObj));
  } else if (Utils.isPlainObject(helpers)) {
    let items = [];
    let keys  = Object.keys(helpers).reverse();

    for (let i, il = keys.length; i < il; i++) {
      let key   = keys[i];
      let exec  = helpers[key];

      if (Utils.isPlainObject(exec)) {
        items.push(registerScopeHelper(exec));
        continue;
      }

      if (typeof exec !== 'function')
        continue;

      let matches = key;
      if (Utils.isType(matches, 'String'))
        matches = new RegExp(matches);

      items.push(registerScopeHelper({ matches, exec }));
    }

    return items;
  } else if (helpers instanceof ScopeHelper) {
    return [ registerScopeHelper(helpers) ];
  }

  throw new TypeError('registerScopeHelpers: invalid value provided.');
}

export function getScopeHelpersForFile(filePath) {
  let helpers = [];

  for (let helper of REGISTERED_BLOCK_HELPERS) {
    if (helper.matches(filePath))
      helpers.push(helper);
  }

  return helpers;
}

export function buildScopeHelperRunner(filePath) {
  return (context) => {
    let {
      scope,
    } = context;

    for (let helper of REGISTERED_BLOCK_HELPERS) {
      if (helper.matches(filePath)) {
        let newScope = helper.exec(context);
        if (!newScope)
          return;

        scope = newScope;
      }
    }

    return scope;
  };
}
