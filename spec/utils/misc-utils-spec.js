/* eslint-disable no-magic-numbers */
'use strict';

/* global describe, it, expect, fail */

const MiscUtils = require('../../src/utils/misc-utils.js');

describe('MiscUtils', () => {
  const sleep = (time) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), time);
    });
  };

  describe('collectPromises', () => {
    it('can collect successful promises', async () => {
      let result = await MiscUtils.collectPromises([
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
      ]);

      expect(result).toEqual([ 1, 2, 3 ]);
    });

    it('will throw an error', async () => {
      try {
        await MiscUtils.collectPromises([
          Promise.resolve(1),
          Promise.reject(new Error('test1')),
          Promise.reject(new Error('test2')),
        ]);

        fail('unreachable');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toEqual('collectPromises: There were errors encountered. Aborting.');
        expect(error.errors).toBeInstanceOf(Array);
        expect(error.errors[0]).toBeInstanceOf(Error);
        expect(error.errors[0].message).toEqual('test1');
        expect(error.errors[1]).toBeInstanceOf(Error);
        expect(error.errors[1].message).toEqual('test2');
      }
    });
  });

  describe('runMiddleware', () => {
    it('can run middleware with a single callback', async () => {
      let result = await MiscUtils.runMiddleware('transformInput', (data, next) => {
        next(data.concat([ 'final' ]));
      }, [ 'input' ]);

      expect(result).toEqual([ 'input', 'final' ]);
    });

    it('can run middleware with no callback', async () => {
      let result = await MiscUtils.runMiddleware('transformInput', null, [ 'input' ]);

      expect(result).toEqual([ 'input' ]);
    });

    it('can run middleware with a chain of middleware', async () => {
      let result = await MiscUtils.runMiddleware('transformInput', null, [ 'input' ], {
        middleware: {
          transformInput: [
            (data, next) => {
              next(data.concat([ 'one' ]));
            },
            (data, next) => {
              next(data.concat([ 'two' ]));
            },
            (data, next) => {
              next(data.concat([ 'three' ]));
            },
          ],
        },
      });

      expect(result).toEqual([ 'input', 'one', 'two', 'three' ]);
    });

    it('can run middleware with a chain of middleware with a callback as well', async () => {
      let result = await MiscUtils.runMiddleware('transformInput', (data, next) => {
        next(data.concat([ 'final' ]));
      }, [ 'input' ], {
        middleware: {
          transformInput: [
            (data, next) => {
              next(data.concat([ 'one' ]));
            },
            (data, next) => {
              next(data.concat([ 'two' ]));
            },
            (data, next) => {
              next(data.concat([ 'three' ]));
            },
          ],
        },
      });

      expect(result).toEqual([ 'input', 'one', 'two', 'three', 'final' ]);
    });

    it('works asynchronously', async () => {
      let result = await MiscUtils.runMiddleware('transformInput', async (data, next) => {
        next(data.concat([ 'final' ]));
      }, [ 'input' ], {
        middleware: {
          transformInput: [
            async (data, next) => {
              await sleep(Math.random() * 20);
              next(data.concat([ 'one' ]));
            },
            (data, next) => {
              next(data.concat([ 'two' ]));
            },
            async (data, next) => {
              await sleep(Math.random() * 20);
              next(data.concat([ 'three' ]));
            },
          ],
        },
      });

      expect(result).toEqual([ 'input', 'one', 'two', 'three', 'final' ]);
    });

    it('can halt the middleware chain', async () => {
      let result = await MiscUtils.runMiddleware('transformInput', (data, next) => {
        next(data.concat([ 'final' ]));
      }, [ 'input' ], {
        middleware: {
          transformInput: [
            (data, next) => {
              next(data.concat([ 'one' ]));
            },
            () => {
              return [ 'two' ];
            },
            (data, next) => {
              next(data.concat([ 'three' ]));
            },
          ],
        },
      });

      expect(result).toEqual([ 'two', 'final' ]);
    });
  });
});
