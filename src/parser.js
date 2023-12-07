import Path       from 'node:path';
import YAML       from 'yaml';
import { glob }   from 'glob';
import * as Utils from './utils/index.js';

import {
  Helper,
  buildHelperRunner,
} from './helpers/index.js';

const BLOCK_PATTERN = /\/\*\*\*[\s\S]*?\*\*\*\//g;

/***
groupName: Parser
desc: |
  Parse all comment blocks out of a text file.
  A `block` is simply a block comment in C/Javascript
  style, except that you must use three asterisks on
  each side of the block (instead of only one).

  Example:
  ```javascript
  /&ast;&ast;&ast;
  desc: This is a block with a "desc" key
  &ast;&ast;&ast;/
  function doSomething() {}
  ```

  Normally one is unable to use things like grave accents "`"
  in YAML, but Biblo does some magic parsing and replacing for
  you so that Markdown format is easier to use in these block
  comments.
args:
  content:
    desc: Content string to parse blocks out of
    type: string
return:
  type: Array[string]
  desc: |
    Return an array of parsed blocks.

    Blocks have the shape `{ content: string, start: number, end: number }`,
    where `start` and `end` represent the start and end indexes of the parsed
    block (respectively).

    `content` is the content of the parsed block.
***/
export function parseBlocks(content) {
  const formatContent = (content) => {
    return content
      .replace(/^\/\*+\s*/, '')
      .replace(/\s*\*+\/$/, '')
      .replace(/&ast;/g, '*')
      .replace(/`/g, '&grave;');
  };

  let blocks = [];
  let previousBlock;

  content.replace(BLOCK_PATTERN, (m, offset) => {
    let newBlock = {
      start:    offset,
      end:      offset + m.length,
      content:  formatContent(m),
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

export function parse(source, _options) {
  const decodeString = (content) => {
    return content
      .replace(/&ast;/g, '*')
      .replace(/&grave;/g, '`');
  };

  let options = _options || {};
  let blocks  = parseBlocks(source);

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
      return;
    }

    if (!scope)
      return;

    if (Utils.isType(scope, 'String'))
      scope = { desc: scope };

    if (options.props)
      scope = Object.assign({}, options.props, scope);

    let helper = options.helper;
    if (helper) {
      if (typeof helper === 'function')
        scope = options.helper({ scope, source, block });
      else if (helper instanceof Helper)
        scope = helper.exec({ scope, source, block });
      else
        throw new TypeError('provided "helper" is not a Helper instance, nor a Function');

      if (!scope)
        return;
    }

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
  if (Utils.NOE(options.root))
    throw new Error('"root" option is required');

  if (Utils.NOE(options.include))
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
