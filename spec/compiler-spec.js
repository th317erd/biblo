'use strict';

/* global describe, it */

const Biblo       = require('../src/index.js');
const TestHelpers = require('./support/test-helpers.js');

describe('biblo', () => {
  describe('compile', () => {
    it('can compile a source file', () => {
      const { content, config } = TestHelpers.loadTestFile('javascript/test01.js');
      let result = Biblo.compileString(content, {
        parser: 'babel',
      });
    });
  });
});
