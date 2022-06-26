'use strict';

const Nife = require('nife');

const DEFAULT_PROP_REGEX = (/^\/[\s\t]{0,1}(\w+)\s*:(.*)$/);

function createParser(parserFunc, defaultFunc) {
  parserFunc.defaultHandler = defaultFunc;
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

      index.push({
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
      return parts[index];
    });

    if (result === str)
      break;

    str = result;
  }

  return result;
}

function parseTypes(str) {
  if (Nife.isEmpty(str))
    return [];

  let result  = substitute(str, /<[^>]+>/g);
  let types   = result.result.split(/\|/g).map((part) => {
    return expand(part, result.parts);
  });

  types = types.map((type) => type.trim()).filter(Boolean);

  return types;
}

function handleDocCommentProperty(parsers, result, currentProperty, currentBody) {
  let body        = currentBody.join('\n');
  let currentName = currentProperty.name;
  let args        = {
    name:   currentName,
    extra:  currentProperty.extra,
    body,
  };

  let parserResult;

  if (typeof parsers === 'function') {
    parserResult = parsers.call(this, result, args);
  } else {
    let parser  = parsers[currentName];
    if (!parser) {
      let items = result[currentName] = [];
      if (!items)
        items = result[currentName] = [];

      items.push(args);
    } else {
      parserResult = parser.call(this, result, args);
    }
  }

  if (parserResult !== undefined)
    result[currentName] = parserResult;
}

function parseDocCommentSection(parsers, lines, propRE, defaultProp) {
  let result          = {};
  let currentBody     = [];
  let currentProperty = defaultProp;

  for (let i = 0, il = lines.length; i < il; i++) {
    let line        = lines[i];
    let isProperty  = false;

    line.replace(propRE, (m, name, extra) => {
      isProperty = true;

      if (currentProperty) {
        handleDocCommentProperty.call(this, parsers, result, currentProperty, currentBody);
        currentBody = [];
      }

      currentProperty = { name: name.trim().toLowerCase(), extra: extra.trim() };
    });

    if (isProperty)
      continue;

    currentBody.push(line.replace(/^\s*\/\s*/, ''));
  }

  handleDocCommentProperty.call(this, parsers, result, currentProperty, currentBody);

  // Handle defaults
  if (parsers && typeof parsers === 'object') {
    let parserNames = Object.keys(parsers);
    for (let i = 0, il = parserNames.length; i < il; i++) {
      let parserName  = parserNames[i];
      let parser      = parsers[parserName];
      let propValue   = result[parserName];

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
