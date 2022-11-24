'use strict';

const Nife = require('nife');

const DEFAULT_PROP_REGEX = (/^\/!?[\s\t]{0,1}([\w$]+)\s*:(.*)$/);

function createParser(parserFunc, defaultFunc, name, injectDefault) {
  parserFunc.defaultHandler = defaultFunc;
  parserFunc.outputName = name;
  parserFunc.injectDefault = (injectDefault !== false);

  return parserFunc;
}

function substitute(_str, regex) {
  let parts = [];
  let str   = _str;
  let result;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    result = str.replace(regex, (match, ...args) => {
      let index = parts.length;

      parts.push({
        match,
        args,
      });

      return `@@@PART[${index}]@@@`;
    });

    if (result === str)
      break;

    str = result;
  }

  return { result, parts };
}

function expand(_str, parts) {
  let str = _str;
  let result;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    result = str.replace(/@@@PART\[(\d+)\]@@@/g, (m, _index) => {
      let index = parseInt(_index, 10);
      return parts[index].match;
    });

    if (result === str)
      break;

    str = result;
  }

  return result;
}

function parseTypes(_str) {
  let str = _str;
  if (Nife.isEmpty(_str))
    return { types: [], assignment: undefined };

  let result = substitute(str, /<[^>]+>/g);

  str = result.result;

  let assignment;
  str = str.replace(/=\s+(.*)$/, (m, a) => {
    assignment = a;
    return '';
  }).trim();

  let types = str.split(/\|/g).map((part) => {
    return expand(part, result.parts);
  });

  types = types.map((type) => type.trim()).filter(Boolean);

  return { types, assignment };
}

function handleDocCommentProperty(parsers, result, currentProperty, currentBody) {
  let body        = currentBody.join('\n').trim();
  let currentName = currentProperty.name;
  let args        = Object.assign({}, currentProperty, { body });

  let lowerName = currentName.toLowerCase();
  let outputName = lowerName;
  let parserResult;

  if (typeof parsers === 'function') {
    if (parsers.outputName)
      outputName = parsers.outputName;

    parserResult = parsers.call(this, result, args);
  } else {
    let parser = parsers[lowerName];
    if (!parser) {
      let items = result[lowerName] = [];
      if (!items)
        items = result[lowerName] = [];

      items.push(args);
    } else {
      if (parser.outputName)
        outputName = parser.outputName;

      parserResult = parser.call(this, result, args);
    }
  }

  if (parserResult !== undefined)
    result[outputName] = parserResult;
}

function parseDocCommentSection(parsers, lines, propRE, defaultProp, _propertyFetcher, rootLevel) {
  let result          = (Nife.isEmpty(parsers)) ? {} : { type: this.type };
  let currentBody     = [];
  let currentProperty = defaultProp;
  let propertyFetcher = (_propertyFetcher) ? _propertyFetcher : (name, extra) => ({ name: name.trim(), extra: extra.trim() });

  for (let i = 0, il = lines.length; i < il; i++) {
    let line              = lines[i];
    let isProperty        = false;
    let shouldCheckRegExp = (rootLevel) ? (lines[i - 1] == null || (/^\/!?\s*$/).test(lines[i - 1])) : true;

    // if (currentProperty && currentProperty.name === 'description')
    //   shouldCheckRegExp = (lines[i - 1] === undefined || lines[i - 1] === '/');

    if (shouldCheckRegExp) {
      line.replace(propRE, (m, ...args) => {
        isProperty = true;

        if ((/^\/!/).test(m))
          result['global'] = true;

        if (currentProperty) {
          handleDocCommentProperty.call(this, parsers, result, currentProperty, currentBody);
          currentBody = [];
        }

        currentProperty = propertyFetcher(...args);
      });
    }

    if (isProperty)
      continue;

    currentBody.push(line.replace(/^\s*\/!?(\s*)/, '$1'));
  }

  handleDocCommentProperty.call(this, parsers, result, currentProperty, currentBody);

  // Handle defaults
  if (parsers && typeof parsers === 'object') {
    let parserNames = Object.keys(parsers);
    for (let i = 0, il = parserNames.length; i < il; i++) {
      let parserName  = parserNames[i];
      let parser      = parsers[parserName];

      if (parser && parser.injectDefault === false)
        continue;

      if (parser && parser.outputName)
        parserName = parser.outputName;

      let propValue = result[parserName];
      if (propValue === undefined && parser && parser.defaultHandler)
        result[parserName] = parser.defaultHandler.call(this, result);
    }
  }

  return result;
}

module.exports = {
  DEFAULT_PROP_REGEX,
  createParser,
  expand,
  handleDocCommentProperty,
  parseDocCommentSection,
  parseTypes,
  substitute,
};
