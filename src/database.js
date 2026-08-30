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
  WHERE status IN ('new', 'running');
`;

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

  async cancelPendingExecutions() {
    const result = await this.pool.query(CLEAN_SQL);
    return result.rowCount || 0;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = { Database, QUEUE_SQL, CLEAN_SQL };
