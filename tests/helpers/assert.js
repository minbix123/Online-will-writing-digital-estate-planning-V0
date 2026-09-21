/**
 * Deterministic Assertion Library for Indian Estate Planning Test Suite
 * Zero external dependencies. Wraps and enhances Node.js assert.
 */
const assert = require('assert');

function formatMsg(defaultMsg, customMsg) {
  return customMsg ? `${customMsg} (${defaultMsg})` : defaultMsg;
}

const Assert = {
  ok(value, message) {
    if (!value) {
      throw new assert.AssertionError({
        message: message || `Expected truthy value, received: ${JSON.stringify(value)}`,
        actual: value,
        expected: true,
        operator: 'ok'
      });
    }
  },

  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new assert.AssertionError({
        message: message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        actual,
        expected,
        operator: '==='
      });
    }
  },

  notEqual(actual, expected, message) {
    if (actual === expected) {
      throw new assert.AssertionError({
        message: message || `Expected value NOT to equal ${JSON.stringify(expected)}`,
        actual,
        expected,
        operator: '!=='
      });
    }
  },

  deepEqual(actual, expected, message) {
    try {
      assert.deepStrictEqual(actual, expected, message);
    } catch (err) {
      throw err;
    }
  },

  includes(collection, item, message) {
    if (typeof collection === 'string') {
      if (!collection.includes(item)) {
        throw new assert.AssertionError({
          message: message || `Expected string to include "${item}"`,
          actual: collection,
          expected: item,
          operator: 'includes'
        });
      }
      return;
    }

    if (Array.isArray(collection)) {
      const found = collection.some(el => {
        try {
          assert.deepStrictEqual(el, item);
          return true;
        } catch {
          return el === item;
        }
      });
      if (!found) {
        throw new assert.AssertionError({
          message: message || `Expected array to include ${JSON.stringify(item)}`,
          actual: collection,
          expected: item,
          operator: 'includes'
        });
      }
      return;
    }

    if (collection && typeof collection === 'object') {
      if (!(item in collection)) {
        throw new assert.AssertionError({
          message: message || `Expected object to contain key "${item}"`,
          actual: Object.keys(collection),
          expected: item,
          operator: 'includesKey'
        });
      }
      return;
    }

    throw new Error(`includes assertion called on invalid collection type: ${typeof collection}`);
  },

  match(actual, regex, message) {
    if (typeof actual !== 'string' || !regex.test(actual)) {
      throw new assert.AssertionError({
        message: message || `Expected "${actual}" to match pattern ${regex}`,
        actual,
        expected: regex.toString(),
        operator: 'match'
      });
    }
  },

  throws(fn, expectedError, message) {
    let thrown = false;
    let actualError = null;
    try {
      fn();
    } catch (e) {
      thrown = true;
      actualError = e;
    }

    if (!thrown) {
      throw new assert.AssertionError({
        message: message || 'Expected function to throw an error, but it did not',
        operator: 'throws'
      });
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        if (!actualError.message.includes(expectedError)) {
          throw new assert.AssertionError({
            message: message || `Expected error message to include "${expectedError}", got "${actualError.message}"`,
            actual: actualError.message,
            expected: expectedError,
            operator: 'throws'
          });
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(actualError.message)) {
          throw new assert.AssertionError({
            message: message || `Expected error message to match ${expectedError}, got "${actualError.message}"`,
            actual: actualError.message,
            expected: expectedError.toString(),
            operator: 'throws'
          });
        }
      } else if (typeof expectedError === 'function') {
        if (!(actualError instanceof expectedError)) {
          throw new assert.AssertionError({
            message: message || `Expected error to be instance of ${expectedError.name}`,
            actual: actualError.constructor.name,
            expected: expectedError.name,
            operator: 'throws'
          });
        }
      }
    }
  },

  async rejects(promiseOrFn, expectedError, message) {
    let rejected = false;
    let actualError = null;

    try {
      const p = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;
      await p;
    } catch (e) {
      rejected = true;
      actualError = e;
    }

    if (!rejected) {
      throw new assert.AssertionError({
        message: message || 'Expected async operation to reject, but it resolved successfully',
        operator: 'rejects'
      });
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        if (!actualError.message.includes(expectedError)) {
          throw new assert.AssertionError({
            message: message || `Expected rejection message to include "${expectedError}", got "${actualError.message}"`,
            actual: actualError.message,
            expected: expectedError,
            operator: 'rejects'
          });
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test(actualError.message)) {
          throw new assert.AssertionError({
            message: message || `Expected rejection message to match ${expectedError}, got "${actualError.message}"`,
            actual: actualError.message,
            expected: expectedError.toString(),
            operator: 'rejects'
          });
        }
      } else if (typeof expectedError === 'function') {
        if (!(actualError instanceof expectedError)) {
          throw new assert.AssertionError({
            message: message || `Expected rejection to be instance of ${expectedError.name}`,
            actual: actualError.constructor.name,
            expected: expectedError.name,
            operator: 'rejects'
          });
        }
      }
    }
  }
};

module.exports = Assert;
