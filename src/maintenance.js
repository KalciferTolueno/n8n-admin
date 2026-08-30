const { randomUUID } = require('node:crypto');

class MaintenanceError extends Error {
  constructor(message, { statusCode = 500, stage = 'unknown', details = {} } = {}) {
    super(message);
    this.name = 'MaintenanceError';
    this.statusCode = statusCode;
    this.stage = stage;
    this.details = details;
  }
}

class MaintenanceConflictError extends MaintenanceError {
  constructor() {
    super('Another maintenance operation is currently running', {
      statusCode: 409,
      stage: 'lock',
    });
    this.name = 'MaintenanceConflictError';
  }
}

class MaintenanceLock {
  constructor() {
    this.activeOperationId = null;
  }

  acquire(operationId) {
    if (this.activeOperationId) throw new MaintenanceConflictError();
    this.activeOperationId = operationId;
  }

  release(operationId) {
    if (this.activeOperationId === operationId) this.activeOperationId = null;
  }

  get active() {
    return Boolean(this.activeOperationId);
  }
}

class OperationStore {
  constructor(limit = 20) {
    this.limit = limit;
    this.operations = new Map();
    this.history = [];
  }

  start({ operationId, action, steps }) {
    const operation = {
      operationId,
      action,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      steps: steps.map((step) => ({ ...step, status: 'pending', detail: '' })),
    };
    this.operations.set(operationId, operation);
    return operation;
  }

  setStep(operationId, key, status, detail = '') {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    const step = operation.steps.find((entry) => entry.key === key);
    if (!step) return;
    step.status = status;
    step.detail = detail;
  }

  complete(operationId) {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    operation.status = 'success';
    operation.completedAt = new Date().toISOString();
    this.record(operation);
  }

  fail(operationId, message) {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    const activeStep = operation.steps.find((step) => step.status === 'active');
    if (activeStep) {
      activeStep.status = 'error';
      activeStep.detail = message;
    }
    operation.status = 'error';
    operation.error = message;
    operation.completedAt = new Date().toISOString();
    this.record(operation);
  }

  record(operation) {
    this.history.unshift({
      operationId: operation.operationId,
      action: operation.action,
      result: operation.status === 'success' ? 'OK' : 'ERROR',
      detail: this.summary(operation),
      at: operation.completedAt || operation.startedAt,
    });
    this.history = this.history.slice(0, this.limit);

    const retained = new Set(this.history.map((entry) => entry.operationId));
    for (const [operationId, candidate] of this.operations.entries()) {
      if (candidate.status !== 'running' && !retained.has(operationId)) {
        this.operations.delete(operationId);
      }
    }
  }

  summary(operation) {
    const completedDetails = operation.steps
      .filter((step) => step.status === 'success' && step.detail)
      .map((step) => step.detail);
    if (operation.status === 'error') return operation.error || 'Operation failed';
    return completedDetails.at(-1) || 'Completed';
  }

  get(operationId) {
    const operation = this.operations.get(operationId);
    if (!operation) return null;
    return JSON.parse(JSON.stringify(operation));
  }

  getHistory() {
    return this.history.map((entry) => ({ ...entry }));
  }
}

function requestOperationId(candidate) {
  if (typeof candidate === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}

function publicError(error) {
  if (error instanceof MaintenanceError) return error;
  return new MaintenanceError('The operation could not be completed. Check the server logs for details.');
}

async function runMaintenance({ lock, store, logger, operationId, action, steps, handler }) {
  lock.acquire(operationId);
  store.start({ operationId, action, steps });
  logger.info('maintenance_started', { operationId, action });

  const progress = {
    async step(key, work) {
      store.setStep(operationId, key, 'active');
      try {
        const detail = await work();
        store.setStep(operationId, key, 'success', detail || 'Completed');
        return detail;
      } catch (error) {
        store.setStep(operationId, key, 'error', error.message || 'Failed');
        throw error;
      }
    },
  };

  try {
    const result = await handler(progress);
    store.complete(operationId);
    logger.info('maintenance_completed', { operationId, action });
    return result;
  } catch (error) {
    const normalized = publicError(error);
    store.fail(operationId, normalized.message);
    logger.error('maintenance_failed', { operationId, action, error });
    throw normalized;
  } finally {
    lock.release(operationId);
  }
}

module.exports = {
  MaintenanceError,
  MaintenanceLock,
  OperationStore,
  requestOperationId,
  runMaintenance,
};
