'use strict';

/* global describe, it, expect */

const Biblo           = require('../src/index.js');
const TestHelpers     = require('./support/test-helpers.js');
const matchesSnapshot = require('./support/snapshots');

describe('biblo', () => {
  describe('compile', () => {
    it('can compile a source file', async () => {
      const { content, config, path } = TestHelpers.loadTestFile('javascript/func-test-default1.js');
      let result = await Biblo.compileString(content, {
        parser:   'babel',
        fileName: path,
      });

      expect(matchesSnapshot(result)).toEqual(true);
    });

    it('can provide the arguments if none are defined', async () => {
      const { content, config, path } = TestHelpers.loadTestFile('javascript/func-test-auto-args1.js');
      let result = await Biblo.compileString(content, {
        parser:   'babel',
        fileName: path,
      });

      expect(matchesSnapshot(result)).toEqual(true);
    });
  });
});
