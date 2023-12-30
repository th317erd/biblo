import Path       from 'node:path';
import YAML       from 'yaml';
import { glob }   from 'glob';
import { decode } from 'html-entities';

import * as Utils from './utils/index.js';

import {
  Helper,
  buildHelperRunner,
} from './helpers/index.js';

const BLOCK_PATTERN         = /\/\*\*\**([\s\S]*?)\*\//g;
const BLOCK_LINE_START_SKIP = /^[^0-Za-z"'-]+/;

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
export function parseBlocks(content, _options) {
  let options = _options || {};

  const formatContent = (_content) => {
    let content = _content;

    let minLineStart = findMinLineStart(content);
    if (minLineStart > 0)
      content = content.split(/\r\n|\r|\n/g).map((line) => line.substring(minLineStart)).join('\n');

    content = content
      .replace(/^\/\*+\s*/, '')
      .replace(/\s*\*+\/$/, '')
      .replace(/&ast;/g, '*')
      .replace(/`/g, '&grave;');

    return content;
  };

  const getBlockPattern = () => {
    let blockPattern = options.blockPattern;
    if (blockPattern) {
      if (typeof blockPattern === 'function')
        return options.blockPattern(options);
      if (Utils.isType(blockPattern, RegExp, 'RegExp'))
        return blockPattern;
      else if (Utils.isType(blockPattern, 'String'))
        return new RegExp(blockPattern, 'gm');
    }

    return BLOCK_PATTERN;
  };

  const findMinLineStart = (block) => {
    return block.split(/\r\n|\r|\n/g).reduce((min, line) => {
      let toStartOfLine = Infinity;
      line.replace(BLOCK_LINE_START_SKIP, (m) => {
        if (m === line) // If whole line was matched, then skip
          return m;

        toStartOfLine = m.length;

        return m;
      });

      return (toStartOfLine < min) ? toStartOfLine : min;
    }, Infinity);
  };

  let blockPattern  = getBlockPattern();
  let blocks        = [];
  let previousBlock;

  content.replace(blockPattern, (m, block, offset) => {
    let end = offset + m.length;

    let newBlock = {
      start:    offset,
      end:      end,
      content:  formatContent(block),
    };

    if (previousBlock) {
      previousBlock.nextBlock = newBlock;
      newBlock.previousBlock = previousBlock;
    }

    blocks.push(newBlock);

    previousBlock = newBlock;

    return m;
  });

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

    scope.lineNumber = (getLineNumber(source, block.end) + 1);

    if (options.props)
      scope = Object.assign({}, options.props, scope);

    let helper = options.helper;
    if (helper) {
      if (typeof helper === 'function')
        scope = options.helper({ scope, source, block, Utils, Parser });
      else if (helper instanceof Helper)
        scope = helper.exec({ scope, source, block, Utils, Parser });
      else
        throw new TypeError('provided "helper" is not a Helper instance, nor a Function');

      if (!scope)
        return;
    }

    // Allow the scope author to
    // fully control everything
    scope = Object.assign({}, scope);

    let scopeAsString = scopeToString(scope);
    scope.id = Utils.SHA256(scopeAsString);

    if (typeof options.blockProcessor === 'function')
      scope = options.blockProcessor({ scope, source, block, Utils, Parser });

    return scope;
  });
}

export function parseFile(filePath, _options) {
  let options = _options || {};
  let content = Utils.loadFileContent(filePath);

  return parse(content, {
    helper:       buildHelperRunner(filePath),
    ...options,
    props:  {
      groupID:    Utils.SHA256(filePath),
      groupName:  Path.basename(filePath).replace(/\.[^.]+$/, ''),
      ...(options.props || {}),
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

  let data = [];
  files.forEach((filePath) => {
    let fileExtension;

    filePath.replace(/\.(.*?)$/, (m, ext) => {
      fileExtension = ext;
      return m;
    });

    data = data.concat(
      parseFile(
        filePath,
        {
          ...options,
          props: {
            filePath: Path.relative(rootPath, filePath),
            fileName: Path.basename(filePath),
            fileExtension,
            ...(options.props || {}),
          },
        },
      ),
    );
  });

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
