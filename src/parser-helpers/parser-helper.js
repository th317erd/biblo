import * as Utils from '../utils/index.js';

const REGISTERED_PARSER_HELPERS = [];

export class ParserHelper {
  constructor(options) {
    if (!options)
      throw new TypeError('ParserHelper(constructor): "options" is required to create a "ParserHelper" instance.');

    if (Utils.isNOE(options.matches))
      throw new TypeError('ParserHelper(constructor): "options.matches" is required to register a parser helper.');

    let blockPattern = options.blockPattern;
    if (Utils.isNOE(blockPattern))
      throw new TypeError('ParserHelper(constructor): "options.blockPattern" is required to register a parser helper.');

    Object.defineProperties(this, {
      'matchesPattern': {
        writable:     false,
        enumerable:   false,
        configurable: false,
        value:        options.matches,
      },
      'blockPattern': {
        writable:     false,
        enumerable:   false,
        configurable: false,
        value:        options.blockPattern,
      },
      'blockSanitizer': {
        writable:     false,
        enumerable:   false,
        configurable: false,
        value:        options.blockSanitizer,
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

  exec(context) {
    let blockPattern    = this.blockPattern;
    let blockSanitizer  = this.blockSanitizer;

    let {
      source,
      blockConsumer,
    } = context;

    const sanitizedBlockConsumer = (rawBlock, _block, offset) => {
      let block = _block;
      if (typeof blockSanitizer === 'function')
        block = blockSanitizer(rawBlock, _block, offset);

      return blockConsumer(rawBlock, block, offset);
    };

    if (typeof blockPattern === 'function') {
      // Use user-defined parser.
      // user-defined parser is expected to call
      // "patternMatcher(totalBlockString, blockString, offset)" for each parsed block
      blockPattern(context);
    } else if (blockPattern instanceof RegExp) {
      source.replace(blockPattern, sanitizedBlockConsumer);
    }
  }
}

export function registerParserHelper(helperObj) {
  let helper = (helperObj instanceof ParserHelper) ? helperObj : new ParserHelper(helperObj);

  REGISTERED_PARSER_HELPERS.unshift(helper);

  return helper;
}

export function registerParserHelpers(helpers) {
  if (!helpers)
    return [];

  if (Array.isArray(helpers)) {
    return helpers.reverse().map((helperObj) => registerParserHelper(helperObj));
  } else if (Utils.isPlainObject(helpers)) {
    let items = [];
    let keys  = Object.keys(helpers).reverse();

    for (let i, il = keys.length; i < il; i++) {
      let matches       = keys[i];
      let blockPattern  = helpers[matches];

      if (Utils.isPlainObject(blockPattern)) {
        items.push(registerParserHelper(blockPattern));
        continue;
      }

      if (typeof matches !== 'symbol')
        matches = new RegExp(('' + matches));

      items.push(registerParserHelper({ matches, blockPattern }));
    }

    return items;
  } else if (helpers instanceof ParserHelper) {
    return [ registerParserHelper(helpers) ];
  }

  throw new TypeError('registerParserHelpers: invalid value provided.');
}

export function getParserHelpersForFile(fullFileName) {
  let helpers = [];

  for (let helper of REGISTERED_PARSER_HELPERS) {
    if (helper.matches(fullFileName))
      helpers.push(helper);
  }

  return helpers;
}

export function buildParserHelperRunner(fullFileName) {
  return (context) => {
    for (let helper of REGISTERED_PARSER_HELPERS) {
      if (helper.matches(fullFileName))
        helper.exec(context);
    }
  };
}
