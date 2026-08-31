const test = require('node:test');
const assert = require('node:assert/strict');

const { validateConcurrency } = require('../src/validation');

test('validateConcurrency accepts every integer in the supported range', () => {
  assert.equal(validateConcurrency(1), 1);
  assert.equal(validateConcurrency(60), 60);
  assert.equal(validateConcurrency(200), 200);
});

test('validateConcurrency rejects values outside 1 through 200 and non-integers', () => {
  for (const value of [0, 201, 1.5, '60', null, undefined]) {
    assert.throws(() => validateConcurrency(value), TypeError);
  }
});
