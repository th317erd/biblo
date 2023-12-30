import * as Utils from '../utils/index.js';

const REGISTERED_HELPERS = [];

export class Helper {
  constructor(options) {
    Object.assign(this, options);
  }

  matches(filePath) {
    return this.pattern.test(filePath);
  }

  exec(...args) {
    return this.callback(...args);
  }
}

export function registerHelper(helperObj) {
  let pattern = helperObj.pattern;
  if (Utils.isNOE(pattern))
    throw new Error('"registerHelpers": "pattern" is required to register a file helper.');

  let callback = helperObj.callback;
  if (Utils.isNOE(pattern))
    throw new Error('"registerHelpers": "callback" is required to register a file helper.');

  let helper = new Helper({
    pattern: (pattern instanceof RegExp) ? pattern : new RegExp(pattern),
    callback,
  });

  REGISTERED_HELPERS.unshift(helper);

  return helper;
}

export function registerHelpers(helpers) {
  if (!helpers)
    return [];

  if (Array.isArray(helpers)) {
    return helpers.reverse().map((helperObj) => registerHelper(helperObj));
  } else if (Utils.isPlainObject(helpers)) {
    let items = [];
    let keys  = Object.keys(helpers).reverse();

    for (let i, il = keys.length; i < il; i++) {
      let key       = keys[i];
      let callback  = helpers[key];

      if (Utils.isPlainObject(callback)) {
        items.push(registerHelper(callback));
        continue;
      }

      if (typeof callback !== 'function')
        continue;

      let pattern = key;
      if (Utils.isType(pattern, 'String'))
        pattern = new RegExp(pattern);

      items.push(registerHelper({ pattern, callback }));
    }

    return items;
  }

  throw new TypeError('"registerHelpers" invalid value provided');
}

export function getHelpersForFile(filePath) {
  let helpers = [];

  for (let helper of REGISTERED_HELPERS) {
    if (helper.matches(filePath))
      helpers.push(helper);
  }

  return helpers;
}

export function buildHelperRunner(filePath) {
  return (context) => {
    let {
      scope,
    } = context;

    for (let helper of REGISTERED_HELPERS) {
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
