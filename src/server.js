const path = require('node:path');
const { randomUUID } = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const { config } = require('./config');
const { logger } = require('./logger');
const { basicAuth } = require('./auth');
const {
  Database,
  validateQueueStatuses,
  remainingSelectedStatuses,
} = require('./database');
const { N8nService } = require('./docker');
const { validateConcurrency, CONCURRENCY_MIN, CONCURRENCY_MAX } = require('./validation');
const {
  MaintenanceError,
  MaintenanceLock,
  OperationStore,
  requestOperationId,
  runMaintenance,
} = require('./maintenance');

const app = express();
const database = new Database(config);
const n8n = new N8nService(config);
const maintenanceLock = new MaintenanceLock();
const operationStore = new OperationStore(20);
const apiAuth = basicAuth(config);
const publicDir = path.resolve(__dirname, '..', 'public');

function apiRateLimit(windowMs, limit) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait and try again.',
      requestId: req.requestId,
    }),
  });
}

function maintenanceError(message, stage, details = {}) {
  return new MaintenanceError(message, { stage, details });
}

async function operationalStep(progress, operationId, key, message, work) {
  return progress.step(key, async () => {
    try {
      return await work();
    } catch (error) {
      logger.error('maintenance_stage_failed', { operationId, stage: key, error });
      throw maintenanceError(message, key, error.details || {});
    }
  });
}

async function stopN8n(progress, operationId, timeoutSeconds = config.serviceStopTimeoutSeconds) {
  return operationalStep(progress, operationId, 'stop', 'n8n could not be stopped', async () => {
    await n8n.scaleTo(0);
    const status = await n8n.waitForReplicas(0, 0, timeoutSeconds);
    logger.info('n8n_stopped', { operationId, desiredReplicas: 0, runningReplicas: 0 });
    return `n8n detenido (${status.runningReplicas}/${status.desiredReplicas})`;
  });
}

async function startN8n(progress, operationId, timeoutSeconds = config.serviceStartTimeoutSeconds) {
  return operationalStep(progress, operationId, 'start', 'n8n could not be started', async () => {
    await n8n.scaleTo(1);
    const status = await n8n.waitForReplicas(1, 1, timeoutSeconds);
    logger.info('n8n_started', { operationId, desiredReplicas: 1, runningReplicas: 1 });
    return `n8n activo (${status.runningReplicas}/${status.desiredReplicas})`;
  });
}

async function performRestart(progress, operationId) {
  await stopN8n(progress, operationId);
  await startN8n(progress, operationId);
  const status = await n8n.getStatus();
  logger.info('n8n_restarted', {
    operationId,
    desiredReplicas: status.desiredReplicas,
    runningReplicas: status.runningReplicas,
  });
  return { success: true, ...replicas(status) };
}

async function performQueueClean(progress, operationId, selectedStatuses) {
  let before = { new: 0, running: 0 };
  let canceled = 0;
  let after = null;
  let stoppedSuccessfully = false;
  let restartedStatus = null;
  let operationError = null;
  let restartError = null;
  const deadline = Date.now() + config.cleanTimeoutSeconds * 1000;
  const remainingCleanSeconds = (stage) => {
    const remaining = Math.ceil((deadline - Date.now()) / 1000);
    if (remaining <= 0) {
      throw maintenanceError('Queue cleaning exceeded CLEAN_TIMEOUT_SECONDS before completion', stage);
    }
    return remaining;
  };

  try {
    await operationalStep(progress, operationId, 'inspect', 'Could not read the execution queue', async () => {
      before = await database.getQueueCounts();
      logger.info('queue_clean_before', {
        operationId,
        selectedStatuses,
        new: before.new,
        running: before.running,
      });
      return selectedStatuses.map((status) => `${before[status]} ${status.toUpperCase()}`).join(' · ');
    });

    await stopN8n(progress, operationId, Math.min(config.serviceStopTimeoutSeconds, remainingCleanSeconds('stop')));
    stoppedSuccessfully = true;

    remainingCleanSeconds('database');
    await operationalStep(progress, operationId, 'database', 'PostgreSQL is not accessible; the queue was not changed', async () => {
      await database.checkConnection();
      logger.info('postgres_connected_for_clean', { operationId });
      return 'PostgreSQL conectado';
    });

    remainingCleanSeconds('clean');
    await operationalStep(progress, operationId, 'clean', 'The queue UPDATE failed; no successful cleanup was reported', async () => {
      canceled = await database.cancelPendingExecutions(selectedStatuses);
      logger.info('queue_clean_canceled', { operationId, selectedStatuses, canceled });
      return `${canceled} ejecución(es) canceladas`;
    });

    remainingCleanSeconds('verify');
    await operationalStep(progress, operationId, 'verify', 'The queue was not completely cleared', async () => {
      after = await database.getQueueCounts();
      logger.info('queue_clean_verified', {
        operationId,
        selectedStatuses,
        new: after.new,
        running: after.running,
      });
      const remainingSelected = remainingSelectedStatuses(after, selectedStatuses);
      if (remainingSelected.length > 0) {
        throw maintenanceError(
          `The selected queue was not completely cleared. Remaining: ${remainingSelected.map((status) => `${after[status]} ${status.toUpperCase()}`).join(' and ')}`,
          'verify',
          { after, selectedStatuses },
        );
      }
      return `${selectedStatuses.map((status) => status.toUpperCase()).join(' + ')} verificada(s) en 0`;
    });
  } catch (error) {
    operationError = error;
  } finally {
    // Once the service reached 0/0, always attempt recovery, even if a later DB stage failed.
    if (stoppedSuccessfully) {
      try {
        // Service recovery is never skipped merely because the cleanup deadline elapsed.
        await startN8n(progress, operationId);
        restartedStatus = await n8n.getStatus();
      } catch (error) {
        restartError = error;
      }
    }
  }

  if (operationError) {
    const details = {
      before,
      selectedStatuses,
      canceled,
      ...(after ? { after } : {}),
      ...(restartedStatus ? { n8n: replicas(restartedStatus) } : {}),
      ...(restartError ? { restartFailed: true } : {}),
    };
    throw new MaintenanceError(
      restartError
        ? `${operationError.message}. n8n recovery also failed; check the server logs immediately.`
        : operationError.message,
      { statusCode: operationError.statusCode || 500, stage: operationError.stage || 'clean', details },
    );
  }

  if (restartError) {
    throw new MaintenanceError(
      'Queue cleanup completed, but n8n could not be started again. Check the server logs immediately.',
      {
        statusCode: 502,
        stage: 'start',
        details: {
          cleanupSucceeded: true,
          before,
          selectedStatuses,
          canceled,
          after,
        },
      },
    );
  }

  return {
    success: true,
    before,
    selectedStatuses,
    canceled,
    after,
    n8n: replicas(restartedStatus),
  };
}

async function performConcurrencyChange(progress, operationId, value) {
  let current;
  await operationalStep(progress, operationId, 'inspect', 'The current n8n concurrency could not be read', async () => {
    current = await n8n.getConcurrency();
    return `Concurrencia actual: ${current ?? 'no definida'}`;
  });
  if (current === value) {
    return {
      success: true,
      concurrency: value,
      unchanged: true,
    };
  }

  let stoppedSuccessfully = false;
  let operationError = null;
  let restartError = null;
  let finalStatus = null;

  try {
    await stopN8n(progress, operationId);
    stoppedSuccessfully = true;

    await operationalStep(progress, operationId, 'update', 'The n8n concurrency configuration could not be updated', async () => {
      await n8n.setConcurrency(value);
      logger.info('concurrency_changed', { operationId, from: current, to: value });
      return `Concurrencia actualizada a ${value}`;
    });

    await startN8n(progress, operationId);

    await operationalStep(progress, operationId, 'verify', 'The requested concurrency value could not be verified', async () => {
      const actual = await n8n.getConcurrency();
      if (actual !== value) {
        throw maintenanceError(`Concurrency verification failed. Expected ${value}, found ${actual ?? 'not set'}`, 'verify');
      }
      finalStatus = await n8n.getStatus();
      return `Concurrencia verificada: ${actual}`;
    });
  } catch (error) {
    operationError = error;
  } finally {
    // An update failure after a successful stop must not leave n8n intentionally down.
    if (stoppedSuccessfully && (!finalStatus || finalStatus.runningReplicas !== 1)) {
      try {
        // Recovery deliberately uses the normal start timeout after a failed concurrency update.
        await startN8n(progress, operationId);
        finalStatus = await n8n.getStatus();
      } catch (error) {
        restartError = error;
      }
    }
  }

  if (operationError) {
    throw new MaintenanceError(
      restartError
        ? `${operationError.message}. n8n recovery also failed; check the server logs immediately.`
        : operationError.message,
      {
        statusCode: operationError.statusCode || 500,
        stage: operationError.stage || 'update',
        details: {
          ...(finalStatus ? { n8n: replicas(finalStatus) } : {}),
          ...(finalStatus?.desiredReplicas === 1 && finalStatus?.runningReplicas === 1 ? { recoverySucceeded: true } : {}),
          ...(restartError ? { restartFailed: true } : {}),
        },
      },
    );
  }

  if (restartError) {
    throw new MaintenanceError('Concurrency was updated, but n8n could not be started again. Check the server logs immediately.', {
      statusCode: 502,
      stage: 'start',
      details: { concurrencyUpdated: true, value },
    });
  }

  return {
    success: true,
    concurrency: value,
    n8n: replicas(finalStatus),
  };
}

function replicas(status) {
  return {
    desiredReplicas: status?.desiredReplicas ?? 0,
    runningReplicas: status?.runningReplicas ?? 0,
  };
}

function operationSteps(action) {
  const sets = {
    stop: [{ key: 'stop', label: 'Deteniendo n8n' }],
    start: [{ key: 'start', label: 'Iniciando n8n' }],
    clean: [
      { key: 'inspect', label: 'Consultando la cola actual' },
      { key: 'stop', label: 'Deteniendo n8n' },
      { key: 'database', label: 'Comprobando PostgreSQL' },
      { key: 'clean', label: 'Cancelando ejecuciones' },
      { key: 'verify', label: 'Verificando la cola' },
      { key: 'start', label: 'Iniciando n8n' },
    ],
    concurrency: [
      { key: 'inspect', label: 'Leyendo configuración actual' },
      { key: 'stop', label: 'Deteniendo n8n' },
      { key: 'update', label: 'Actualizando configuración' },
      { key: 'start', label: 'Iniciando n8n' },
      { key: 'verify', label: 'Verificando concurrencia' },
    ],
    restart: [
      { key: 'stop', label: 'Deteniendo n8n' },
      { key: 'start', label: 'Iniciando n8n' },
    ],
  };
  return sets[action];
}

async function executeMaintenance(req, res, action, handler) {
  const operationId = req.operationId || requestOperationId(req.get('x-operation-id'));
  req.operationId = operationId;
  const result = await runMaintenance({
    lock: maintenanceLock,
    store: operationStore,
    logger,
    operationId,
    action,
    steps: operationSteps(action),
    handler,
  });
  return res.json({ ...result, operationId });
}

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
}));
app.use(express.json({ limit: '10kb' }));
app.use((req, res, next) => {
  req.requestId = randomUUID();
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get(['/', '/index.html'], apiAuth, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.use('/assets', apiAuth, express.static(publicDir, { index: false, fallthrough: false }));

app.use('/api', apiAuth, apiRateLimit(60_000, 180));
const adminRateLimiter = apiRateLimit(60_000, 20);

app.get('/api/status', async (req, res) => {
  const [n8nResult, queueResult] = await Promise.allSettled([
    n8n.getStatus(),
    database.getQueueCounts(),
  ]);

  const n8nStatus = n8nResult.status === 'fulfilled'
    ? n8nResult.value
    : {
      service: config.n8nService,
      desiredReplicas: 0,
      runningReplicas: 0,
      status: 'error',
      taskState: 'unavailable',
      concurrency: null,
      error: 'Docker service status is unavailable',
      diagnostic: {
        taskState: 'unavailable',
        message: String(n8nResult.reason?.message || 'Could not connect to the Docker Engine API').slice(0, 500),
        ...(n8nResult.reason?.code ? { error: String(n8nResult.reason.code).slice(0, 80) } : {}),
      },
    };
  const postgresConnected = queueResult.status === 'fulfilled';

  return res.json({
    n8n: n8nStatus,
    postgres: postgresConnected
      ? { status: 'connected' }
      : { status: 'error', error: 'PostgreSQL connection is unavailable' },
    queue: postgresConnected ? queueResult.value : { new: 0, running: 0 },
    maintenanceActive: maintenanceLock.active,
  });
});

app.get('/api/history', (req, res) => {
  res.json({ operations: operationStore.getHistory() });
});

app.get('/api/operations/:operationId', (req, res) => {
  const operation = operationStore.get(req.params.operationId);
  if (!operation) {
    return res.status(404).json({ success: false, error: 'Operation not found' });
  }
  return res.json(operation);
});

app.post('/api/n8n/stop', adminRateLimiter, async (req, res, next) => {
  try {
    await executeMaintenance(req, res, 'stop', async (progress) => {
      await stopN8n(progress, req.operationId);
      const status = await n8n.getStatus();
      return { success: true, ...replicas(status) };
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/n8n/start', adminRateLimiter, async (req, res, next) => {
  try {
    await executeMaintenance(req, res, 'start', async (progress) => {
      await startN8n(progress, req.operationId);
      const status = await n8n.getStatus();
      return { success: true, ...replicas(status) };
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/n8n/restart', adminRateLimiter, async (req, res, next) => {
  try {
    await executeMaintenance(req, res, 'restart', (progress) => performRestart(progress, req.operationId));
  } catch (error) {
    next(error);
  }
});

app.post('/api/queue/clean', adminRateLimiter, async (req, res, next) => {
  let selectedStatuses;
  try {
    selectedStatuses = validateQueueStatuses(req.body?.statuses);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'statuses must select new, running, or both',
    });
  }

  try {
    req.operationId = requestOperationId(req.get('x-operation-id'));
    logger.info('queue_clean_requested', { operationId: req.operationId, selectedStatuses });
    await executeMaintenance(req, res, 'clean', (progress) => performQueueClean(progress, req.operationId, selectedStatuses));
  } catch (error) {
    next(error);
  }
});

app.post('/api/n8n/concurrency', adminRateLimiter, async (req, res, next) => {
  let value;
  try {
    value = validateConcurrency(req.body?.value);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: `value must be an integer between ${CONCURRENCY_MIN} and ${CONCURRENCY_MAX}`,
    });
  }

  try {
    await executeMaintenance(req, res, 'concurrency', (progress) => performConcurrencyChange(progress, req.operationId, value));
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const normalized = error instanceof MaintenanceError
    ? error
    : new MaintenanceError('The request could not be completed. Check the server logs for details.');
  logger.error('request_failed', {
    requestId: req.requestId,
    operationId: req.operationId,
    path: req.path,
    error,
  });
  return res.status(normalized.statusCode || 500).json({
    success: false,
    error: normalized.message,
    ...(req.operationId ? { operationId: req.operationId } : {}),
    ...(normalized.stage ? { stage: normalized.stage } : {}),
    ...(Object.keys(normalized.details || {}).length ? { details: normalized.details } : {}),
  });
});

async function bootstrap() {
  try {
    await database.checkConnection();
    logger.info('postgres_connected_on_startup');
  } catch (error) {
    logger.warn('postgres_unavailable_on_startup', { error });
  }

  app.listen(config.port, config.host, () => {
    logger.info('application_started', {
      host: config.host,
      port: config.port,
      n8nService: config.n8nService,
    });
  });
}

async function shutdown(signal) {
  logger.info('application_stopping', { signal });
  await database.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch((error) => {
  logger.error('application_start_failed', { error });
  process.exit(1);
});
