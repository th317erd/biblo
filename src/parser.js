import Path       from 'node:path';
import YAML       from 'yaml';
import { glob }   from 'glob';

import * as Utils from './utils/index.js';

import {
  ScopeHelper,
  buildScopeHelperRunner,
} from './scope-helpers/index.js';

import {
  ParserHelper,
  buildParserHelperRunner,
} from './parser-helpers/index.js';

export function getLineNumber(content, offset) {
  let lines = content.substring(0, offset).split(/\r\n|\r|\n/g);
  return lines.length;
}

/***
 * groupName: Parser
 * desc: |
 *   Parse all comment blocks out of a text file.
 *   A `block` is simply a block comment in C/Javascript
 *   style, except that you must use three asterisks on
 *   each side of the block (instead of only one).
 *
 *   Example:
 *   ```javascript
 *   /&ast;&ast;&ast;
 *   desc: This is a block with a "desc" key
 *   &ast;&ast;&ast;/
 *   function doSomething() {}
 *   ```
 *
 *   Normally one is unable to use things like grave accents "`"
 *   in YAML, but Biblo does some magic parsing and replacing for
 *   you so that Markdown format is easier to use in these block
 *   comments.
 * args:
 *   content:
 *     desc: Content string to parse blocks out of
 *     type: string
 * return:
 *   type: Array[string]
 *   desc: |
 *     Return an array of parsed blocks.
 *
 *     Blocks have the shape `{ content: string, start: number, end: number }`,
 *     where `start` and `end` represent the start and end indexes of the parsed
 *     block (respectively).
 *
 *     `content` is the content of the parsed block.
***/
export function parseBlocks(source, _options) {
  let options = _options || {};
  let blocks  = [];
  let previousBlock;

  const blockConsumer = (rawBlock, block, offset) => {
    if (Utils.isNOE(block))
      return;

    let end       = offset + rawBlock.length;
    let newBlock  = {
      start:    offset,
      end:      end,
      content:  block,
    };

    if (previousBlock) {
      previousBlock.nextBlock = newBlock;
      newBlock.previousBlock = previousBlock;
    }

    blocks.push(newBlock);

    previousBlock = newBlock;

    return rawBlock;
  };

  let parserHelper = options.parserHelper;
  if (!parserHelper && options.fullFileName)
    parserHelper = buildParserHelperRunner(options.fullFileName);

  if (!parserHelper)
    throw new TypeError('parseBlocks: "options.parserHelper" is required.');

  if (typeof parserHelper === 'function')
    parserHelper({ source, blockConsumer, options, Utils, Parser });
  else if (parserHelper instanceof ParserHelper)
    parserHelper.exec({ source, blockConsumer, options, Utils, Parser });
  else
    throw new TypeError('parseBlocks: provided "parserHelper" is not a ParserHelper instance, nor a Function.');

  return blocks;
}

export function scopeToString(scope) {
  let keys = Object.keys(scope);

  const toString = (_value) => {
    let value = _value;
    if (value == null)
      return ('' + value);

    if (typeof value.valueOf === 'function')
      value = value.valueOf();

    if (typeof value === 'object')
      value = JSON.stringify(value);

    if (typeof value.toString === 'function')
      return value.toString();

    return ('' + value);
  };

  return keys.sort().map((key) => {
    return `${key.replace(/:/g, '\\:')}:${toString(scope[key]).replace(/,/g, '\\,')}`;
  }).join(',');
}

export function calculateBlockID(scope) {
  let scopeAsString = scopeToString(scope);
  return Utils.SHA256(scopeAsString);
}

export function parse(source, _options) {
  const decodeString = (content) => {
    return content.replace(/&grave;/g, '`');
  };

  let options = _options || {};
  let blocks  = parseBlocks(source, options);

  return blocks.map((block) => {
    let scope;
    try {
      scope = YAML.parse(
        block.content,
        (key, value) => {
          if (Utils.isType(value, 'String'))
            return decodeString(value);

          return value;
        },
      );
    } catch (error) {
      // NOOP
      console.error(error, '\n\n', block.content);
      return;
    }

    if (!scope)
      return;

    if (Utils.isType(scope, 'String'))
      scope = { desc: scope };

    if (options.props)
      scope = Object.assign({}, options.props, scope);

    let originalScope = Object.assign({}, scope);

    if (scope.lineNumber == null)
      scope.lineNumber = (getLineNumber(source, block.end) + 1);

    let scopeHelper = options.scopeHelper;
    if (scopeHelper) {
      if (typeof scopeHelper === 'function')
        scope = scopeHelper({ scope, source, block, Utils, Parser });
      else if (scopeHelper instanceof ScopeHelper)
        scope = scopeHelper.exec({ scope, source, block, Utils, Parser });
      else
        throw new TypeError('parse: provided "scopeHelper" is not a ScopeHelper instance, nor a Function.');

      if (!scope)
        return;
    }

    // Allow the scope author to fully control everything
    scope = Object.assign({}, scope, originalScope);

    let scopeAsString = scopeToString(scope);
    scope.id = Utils.SHA256(scopeAsString);

    if (typeof options.scopeProcessor === 'function')
      scope = options.scopeProcessor({ scope, source, block, Utils, Parser });

    return scope;
  });
}

export function parseFile(_filePath, _options) {
  let fullFileName  = Path.resolve(_filePath);
  let options       = _options || {};
  let content       = Utils.loadFileContent(fullFileName);
  let fileName      = Path.basename(fullFileName);
  let fileExtension;

  fullFileName.replace(/\.(.*?)$/, (m, ext) => {
    fileExtension = ext;
    return m;
  });

  return parse(content, {
    scopeHelper:  buildScopeHelperRunner(fullFileName),
    parserHelper: buildParserHelperRunner(fullFileName),
    ...options,
    props:        {
      groupID:    Utils.SHA256(fullFileName),
      groupName:  fileName.replace(/\.[^.]+$/, ''),
      ...(options.props || {}),
      filePath:   Path.dirname(fullFileName),
      fullFileName,
      fileName,
      fileExtension,
    },
  });
}

export async function parsePath(_options) {
  let options = _options;
  if (Utils.isNOE(options.root))
    throw new Error('"root" option is required');

  if (Utils.isNOE(options.include))
    throw new Error('"include" option is required');

  let rootPath  = options.root;
  let files     = await glob(options.include, {
    cwd:        rootPath,
    ignore:     options.exclude,
    matchBase:  true,
    nodir:      false,
    ...(options.glob || {}),
  });

  let data = files.reduce((data, filePath) => {
    return data.concat(parseFile(filePath, { ...options }));
  }, []);

  return data;
}

const Parser = {
  getLineNumber,
  parseBlocks,
  scopeToString,
  calculateBlockID,
  parse,
  parseFile,
  parsePath,
};
