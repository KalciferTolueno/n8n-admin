const test = require('node:test');
const assert = require('node:assert/strict');

const {
  N8nService,
  classifyServiceTasks,
  currentTasks,
  readConcurrency,
} = require('../src/docker');

function task({ id, slot = 1, version, state, desiredState = 'running', message, error, createdAt }) {
  return {
    ID: id,
    Slot: slot,
    Version: { Index: version },
    ...(createdAt ? { CreatedAt: createdAt } : {}),
    DesiredState: desiredState,
    Status: { State: state, Message: message, Err: error },
  };
}

test('latest task per replica wins over historical failures', () => {
  const tasks = [
    task({ id: 'old', version: 30, createdAt: '2026-08-30T10:00:00Z', state: 'failed', desiredState: 'shutdown', error: 'old failure' }),
    task({ id: 'current', version: 20, createdAt: '2026-08-30T10:01:00Z', state: 'running' }),
  ];

  assert.deepEqual(currentTasks(tasks).map((candidate) => candidate.ID), ['current']);
  assert.deepEqual(classifyServiceTasks(1, tasks), {
    status: 'online',
    runningReplicas: 1,
    taskState: 'running',
    diagnostic: null,
  });
});

test('service state distinguishes offline, starting, stopping, and current errors', () => {
  assert.equal(classifyServiceTasks(0, [task({ id: 'off', version: 1, state: 'shutdown', desiredState: 'shutdown' })]).status, 'offline');
  assert.equal(classifyServiceTasks(1, [task({ id: 'boot', version: 1, state: 'preparing' })]).status, 'starting');
  assert.equal(classifyServiceTasks(0, [task({ id: 'stop', version: 1, state: 'running', desiredState: 'shutdown' })]).status, 'stopping');

  const failed = classifyServiceTasks(1, [task({
    id: 'bad',
    version: 1,
    state: 'rejected',
    message: 'preparing failed',
    error: 'port already in use',
  })]);
  assert.equal(failed.status, 'error');
  assert.deepEqual(failed.diagnostic, {
    taskState: 'rejected',
    message: 'preparing failed',
    error: 'port already in use',
  });
});

test('readConcurrency reads only the target environment variable', () => {
  const service = {
    Spec: {
      TaskTemplate: {
        ContainerSpec: {
          Env: ['EXECUTIONS_PROCESS=main', 'N8N_CONCURRENCY_PRODUCTION_LIMIT=60', 'SECRET=preserved'],
        },
      },
    },
  };
  assert.equal(readConcurrency(service), 60);
});

test('setConcurrency changes only the target environment variable', async () => {
  const service = Object.create(N8nService.prototype);
  const spec = {
    TaskTemplate: {
      ContainerSpec: {
        Env: ['EXECUTIONS_PROCESS=main', 'N8N_CONCURRENCY_PRODUCTION_LIMIT=40', 'SECRET=preserved'],
      },
    },
  };
  service.updateSpec = async (mutator) => mutator(spec);

  await service.setConcurrency(60);

  assert.deepEqual(spec.TaskTemplate.ContainerSpec.Env, [
    'EXECUTIONS_PROCESS=main',
    'N8N_CONCURRENCY_PRODUCTION_LIMIT=60',
    'SECRET=preserved',
  ]);
});
