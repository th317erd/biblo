'use strict';

const Nife = require('nife');

const DEFAULT_PROP_REGEX = (/^\/[\s\t]{0,1}(\w+)\s*:(.*)$/);

function createParser(parserFunc, defaultFunc, name) {
  parserFunc.defaultHandler = defaultFunc;
  parserFunc.outputName = name;

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
  let body        = currentBody.join('\n').trim();
  let currentName = currentProperty.name;
  let args        = {
    name:   currentName,
    extra:  currentProperty.extra,
    body,
  };

  if (!this.target)
    this.target = {};

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

function parseDocCommentSection(parsers, lines, propRE, defaultProp) {
  if (!this.target)
    this.target = {};

  let result          = { type: this.target.type };
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

      currentProperty = { name: name.trim(), extra: extra.trim() };
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
