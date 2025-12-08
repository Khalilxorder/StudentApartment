/**
 * Structured logging utility using Pino
 * Provides consistent logging across the application
 */

import pino from 'pino';

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Redact sensitive information (PII)
  redact: {
    paths: [
      'email',
      'password',
      '*.email',
      '*.password',
      'req.headers.authorization',
      'req.headers.cookie',
      'user.email',
      'user.password',
      'token',
      '*.token',
    ],
    remove: true,
  },

  // Format configuration
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Base configuration for all logs
  base: {
    env: process.env.NODE_ENV,
    service: 'student-apartments',
  },

  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log API request
 */
export function logRequest(
  method: string,
  path: string,
  metadata?: Record<string, any>
) {
  logger.info({
    type: 'request',
    method,
    path,
    ...metadata,
  }, `${method} ${path}`);
}

/**
 * Log API response
 */
export function logResponse(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
) {
  const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[logLevel]({
    type: 'response',
    method,
    path,
    statusCode,
    duration,
    ...metadata,
  }, `${method} ${path} ${statusCode} ${duration}ms`);
}

/**
 * Log errors with context
 */
export function logError(
  error: Error,
  context?: Record<string, any>
) {
  logger.error({
    type: 'error',
    err: error,
    ...context,
  }, error.message);
}

/**
 * Log security events
 */
export function logSecurity(
  event: string,
  metadata: Record<string, any>
) {
  logger.warn({
    type: 'security',
    event,
    ...metadata,
  }, `Security event: ${event}`);
}

/**
 * Log business events
 */
export function logEvent(
  event: string,
  metadata?: Record<string, any>
) {
  logger.info({
    type: 'event',
    event,
    ...metadata,
  }, `Event: ${event}`);
}

export default logger;
