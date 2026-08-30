function serializeError(error) {
  if (!error) return undefined;
  return {
    name: error.name,
    message: error.message,
    ...(error.code ? { code: error.code } : {}),
    ...(error.stage ? { stage: error.stage } : {}),
  };
}

function write(level, event, context = {}) {
  const safeContext = context.error instanceof Error
    ? { ...context, error: serializeError(context.error) }
    : context;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeContext,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const logger = Object.freeze({
  info(event, context) {
    write('info', event, context);
  },
  warn(event, context) {
    write('warn', event, context);
  },
  error(event, context = {}) {
    write('error', event, context);
  },
});

module.exports = { logger, serializeError };
