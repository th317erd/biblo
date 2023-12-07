import * as _TestHelpers from './support/test-helpers.js';

import { Parser } from '../src/index.js';

describe('Parser', () => {
  describe('parseBlocks', () => {
    it('works', async () => {
      let result = Parser.parseBlocks(_TestHelpers.loadTestFile('parser-test/blocks-test01.txt'));
      expect(result).toMatchSnapshot();
    });
  });

  describe('parse', () => {
    it('works', async () => {
      let result = Parser.parse(_TestHelpers.loadTestFile('parser-test/blocks-test02.txt'));
      expect(result).toMatchSnapshot();
    });

    it('works with a helper', async () => {
      let result = Parser.parse(
        _TestHelpers.loadTestFile('parser-test/blocks-test02.txt'),
        {
          helper: ({ source, scope, block }) => {
            let sub = source.substring(block.end, block.nextBlock && block.nextBlock.start);

            sub.replace(/[\s\r\n]*(export\s+)?(?:let|var|const\s*=\s*)?(function|class)/, (m, e, type) => {
              if (e)
                scope.exported = true;

              scope.type = (type === 'function') ? 'Function' : 'Class';

              return m;
            });

            return scope;
          },
        },
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('parseFile', () => {
    it('works', async () => {
      let result = Parser.parseFile(_TestHelpers.getTestFilePath('parser-test/blocks-test02.txt'));
      expect(result).toMatchSnapshot();
    });
  });
});
