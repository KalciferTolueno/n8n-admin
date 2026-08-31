const CONCURRENCY_MIN = 1;
const CONCURRENCY_MAX = 200;

function validateConcurrency(value) {
  if (!Number.isInteger(value) || value < CONCURRENCY_MIN || value > CONCURRENCY_MAX) {
    throw new TypeError(`value must be an integer between ${CONCURRENCY_MIN} and ${CONCURRENCY_MAX}`);
  }
  return value;
}

module.exports = { CONCURRENCY_MIN, CONCURRENCY_MAX, validateConcurrency };
