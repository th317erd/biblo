'use strict';

/* global describe, it, expect */

const Util            = require('util');
const Biblo           = require('../src/index.js');
const TestHelpers     = require('./support/test-helpers.js');
const matchesSnapshot = require('./support/snapshots');

describe('biblo', () => {
  describe('javascript', () => {
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

  describe('typescript', () => {
    describe('compile', () => {
      it('can provide the arguments if none are defined', async () => {
        const path = TestHelpers.getTestFilePath('typescript/func-test-auto-args1.ts');
        let result = await Biblo.compileFile(path, {
          parser:   'typescript',
          fileName: path,
        });

        expect(matchesSnapshot(result)).toEqual(true);
      });
    });
  });
});
