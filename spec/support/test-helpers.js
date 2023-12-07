import Path                 from 'node:path';
import FileSystem           from 'node:fs';
import { fileURLToPath }    from 'node:url';
import * as Util            from 'node:util';

import {
  matchesSnapshot,
  isPlainObject,
} from './snapshot.js';

beforeEach(function() {
  jasmine.addMatchers({
    toMatchSnapshot: function() {
      return {
        compare: function(actual, skipMessage) {
          let result  = matchesSnapshot(actual);
          let message = (result && skipMessage !== true) ? `Expected [${actual}] to match snapshot\n${result}` : `Expected [${actual}] to match snapshot`;

          return { pass: !result, message };
        },
      };
    },
  });
});

const __filename  = fileURLToPath(import.meta.url);
const __dirname   = Path.dirname(__filename);

export function getTestFilePath(name) {
  let fullPath = Path.resolve(__dirname, 'test-files', name);
  return fullPath;
}

export function loadTestFile(name) {
  let fullPath = getTestFilePath(name);
  return FileSystem.readFileSync(fullPath, 'utf8');
}

const INSPECT_OPTIONS = Object.assign(Object.create(null), {
  depth:            Infinity,
  colors:           true,
  maxArrayLength:   Infinity,
  maxStringLength:  Infinity,
  breakLength:      Infinity,
  compact:          false,
  sorted:           false,
  getters:          false,
  numericSeparator: false,
});

export function inspect(...args) {
  let options = INSPECT_OPTIONS;
  if (this !== globalThis && isPlainObject(this))
    options = Object.assign({}, INSPECT_OPTIONS, this);

  return args.map((arg) => Util.inspect(arg, options)).join('');
}

export function inspectLog(...args) {
  console.log(inspect.call(this, ...args));
}
