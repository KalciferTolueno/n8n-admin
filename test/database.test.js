const test = require('node:test');
const assert = require('node:assert/strict');

const {
  Database,
  CLEAN_SQL,
  validateQueueStatuses,
  remainingSelectedStatuses,
} = require('../src/database');

test('validateQueueStatuses accepts each supported cleanup scope', () => {
  assert.deepEqual(validateQueueStatuses(['new']), ['new']);
  assert.deepEqual(validateQueueStatuses(['running']), ['running']);
  assert.deepEqual(validateQueueStatuses(['new', 'running']), ['new', 'running']);
});

test('validateQueueStatuses rejects missing, duplicated, and unknown statuses', () => {
  for (const candidate of [undefined, [], ['new', 'new'], ['success'], ['new', 'success']]) {
    assert.throws(() => validateQueueStatuses(candidate), TypeError);
  }
});

test('cancelPendingExecutions sends only the selected statuses as a SQL parameter', async () => {
  const calls = [];
  const database = Object.create(Database.prototype);
  database.pool = {
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      return { rowCount: 7 };
    },
  };

  const canceled = await database.cancelPendingExecutions(['running']);

  assert.equal(canceled, 7);
  assert.deepEqual(calls, [{ sql: CLEAN_SQL, parameters: [['running']] }]);
  assert.match(CLEAN_SQL, /status::text = ANY\(\$1::text\[\]\)/);
});

test('verification ignores a non-selected queue that still contains executions', () => {
  assert.deepEqual(remainingSelectedStatuses({ new: 0, running: 14 }, ['new']), []);
  assert.deepEqual(remainingSelectedStatuses({ new: 9, running: 0 }, ['running']), []);
  assert.deepEqual(remainingSelectedStatuses({ new: 9, running: 0 }, ['new', 'running']), ['new']);
});
