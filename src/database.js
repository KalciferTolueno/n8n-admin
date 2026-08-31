const { Pool } = require('pg');

const QUEUE_SQL = `
  SELECT status, COUNT(*) AS cantidad
  FROM execution_entity
  WHERE status IN ('new', 'running')
  GROUP BY status;
`;

const CLEAN_SQL = `
  UPDATE execution_entity
  SET status = 'canceled',
      "stoppedAt" = COALESCE("stoppedAt", NOW())
  WHERE status::text = ANY($1::text[]);
`;

const ALLOWED_QUEUE_STATUSES = Object.freeze(['new', 'running']);

function validateQueueStatuses(statuses) {
  if (!Array.isArray(statuses) || statuses.length < 1 || statuses.length > ALLOWED_QUEUE_STATUSES.length) {
    throw new TypeError('statuses must select NEW, RUNNING, or both');
  }

  const normalized = [...new Set(statuses)];
  if (normalized.length !== statuses.length || normalized.some((status) => !ALLOWED_QUEUE_STATUSES.includes(status))) {
    throw new TypeError('statuses must contain only unique values: new, running');
  }
  return normalized;
}

function remainingSelectedStatuses(counts, statuses) {
  return validateQueueStatuses(statuses).filter((status) => Number(counts?.[status]) !== 0);
}

class Database {
  constructor(config) {
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  async checkConnection() {
    await this.pool.query('SELECT 1 AS connected');
    return { status: 'connected' };
  }

  async getQueueCounts() {
    const { rows } = await this.pool.query(QUEUE_SQL);
    const counts = { new: 0, running: 0 };
    for (const row of rows) {
      if (row.status === 'new' || row.status === 'running') {
        counts[row.status] = Number.parseInt(row.cantidad, 10) || 0;
      }
    }
    return counts;
  }

  async cancelPendingExecutions(statuses) {
    const selectedStatuses = validateQueueStatuses(statuses);
    const result = await this.pool.query(CLEAN_SQL, [selectedStatuses]);
    return result.rowCount || 0;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = {
  Database,
  QUEUE_SQL,
  CLEAN_SQL,
  ALLOWED_QUEUE_STATUSES,
  validateQueueStatuses,
  remainingSelectedStatuses,
};
