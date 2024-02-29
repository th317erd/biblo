import { registerParserHelper } from './parser-helper.js';

const BLOCK_LINE_START_SKIP = /^[^0-Za-z"'-]+/;
const BLOCK_PATTERN         = /\/\*\*\**([\s\S]*?)\*\//g;

function findMinLineStart(block) {
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
}

export const JavascriptParserHelper = registerParserHelper({
  matches:        /\.([cm]?js|tsx?)$/i,
  blockPattern:   BLOCK_PATTERN,
  blockSanitizer: (_, blockString) => {
    let content = blockString;

    let minLineStart = findMinLineStart(content);
    if (minLineStart > 0)
      content = content.split(/\r\n|\r|\n/g).map((line) => line.substring(minLineStart)).join('\n');

    content = content
      .replace(/^\/\*+\s*/, '')
      .replace(/\s*\*+\/$/, '')
      .replace(/&ast;/g, '*')
      .replace(/`/g, '&grave;');

    return content;
  },
});
