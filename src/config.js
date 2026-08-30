const path = require('node:path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

function required(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function integer(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name] ?? String(fallback);
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Environment variable ${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'production',
  host: '0.0.0.0',
  port: integer('PORT', 3000, { min: 1, max: 65535 }),
  n8nService: required('N8N_SERVICE'),
  postgres: Object.freeze({
    host: required('POSTGRES_HOST'),
    port: integer('POSTGRES_PORT', 5432, { min: 1, max: 65535 }),
    database: required('POSTGRES_DB'),
    user: required('POSTGRES_USER'),
    password: process.env.POSTGRES_PASSWORD || '',
  }),
  appUsername: required('APP_USERNAME'),
  appPassword: required('APP_PASSWORD'),
  cleanTimeoutSeconds: integer('CLEAN_TIMEOUT_SECONDS', 120, { min: 10, max: 1800 }),
  serviceStartTimeoutSeconds: integer('SERVICE_START_TIMEOUT_SECONDS', 120, { min: 10, max: 1800 }),
  serviceStopTimeoutSeconds: integer('SERVICE_STOP_TIMEOUT_SECONDS', 120, { min: 10, max: 1800 }),
  allowedConcurrency: Object.freeze([20, 30, 40, 50, 60, 70, 80]),
});

module.exports = { config };
