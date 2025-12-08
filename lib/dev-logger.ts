/**
 * Enhanced Development Logging
 * 
 * Structured logging with different levels and contexts
 * Integrates with Pino for production
 */

import pino from 'pino';

// Initialize logger
const logger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    formatters: {
        level: (label) => {
            return { level: label.toUpperCase() };
        },
    },
    ...(process.env.NODE_ENV !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
            },
        },
    }),
});

export class DevLogger {
    /**
     * Log API request/response
     */
    static logRequest(data: {
        method: string;
        url: string;
        status: number;
        duration: number;
        userId?: string;
        error?: any;
    }) {
        const { method, url, status, duration, userId, error } = data;

        if (error) {
            logger.error({
                type: 'api_request',
                method,
                url,
                status,
                duration,
                userId,
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                } : error,
            }, `${method} ${url} - ${status} (${duration}ms)`);
        } else {
            logger.info({
                type: 'api_request',
                method,
                url,
                status,
                duration,
                userId,
            }, `${method} ${url} - ${status} (${duration}ms)`);
        }
    }

    /**
     * Log database query
     */
    static logQuery(data: {
        table: string;
        operation: 'select' | 'insert' | 'update' | 'delete';
        duration: number;
        rowCount?: number;
        error?: any;
    }) {
        const { table, operation, duration, rowCount, error } = data;

        if (error) {
            logger.error({
                type: 'database_query',
                table,
                operation,
                duration,
                error: error instanceof Error ? error.message : error,
            }, `DB ${operation.toUpperCase()} ${table} failed`);
        } else if (duration > 100) {
            logger.warn({
                type: 'database_query',
                table,
                operation,
                duration,
                rowCount,
            }, `Slow query: ${operation.toUpperCase()} ${table} (${duration}ms)`);
        } else {
            logger.debug({
                type: 'database_query',
                table,
                operation,
                duration,
                rowCount,
            }, `DB ${operation.toUpperCase()} ${table}`);
        }
    }

    /**
     * Log external API call
     */
    static logExternalAPI(data: {
        service: 'stripe' | 'google-maps' | 'gemini-ai' | 'meilisearch' | 'other';
        operation: string;
        duration: number;
        success: boolean;
        error?: any;
    }) {
        const { service, operation, duration, success, error } = data;

        if (!success) {
            logger.error({
                type: 'external_api',
                service,
                operation,
                duration,
                error: error instanceof Error ? error.message : error,
            }, `${service} API call failed: ${operation}`);
        } else if (duration > 1000) {
            logger.warn({
                type: 'external_api',
                service,
                operation,
                duration,
            }, `Slow ${service} API: ${operation} (${duration}ms)`);
        } else {
            logger.debug({
                type: 'external_api',
                service,
                operation,
                duration,
            }, `${service} API: ${operation}`);
        }
    }

    /**
     * Log authentication event
     */
    static logAuth(data: {
        event: 'login' | 'logout' | 'signup' | 'password_reset' | 'mfa_challenge';
        userId?: string;
        email?: string;
        success: boolean;
        method?: 'email' | 'google' | 'sso';
        error?: any;
    }) {
        const { event, userId, email, success, method, error } = data;

        if (!success) {
            logger.warn({
                type: 'auth_event',
                event,
                userId,
                email,
                method,
                error: error instanceof Error ? error.message : error,
            }, `Auth ${event} failed`);
        } else {
            logger.info({
                type: 'auth_event',
                event,
                userId,
                email,
                method,
            }, `Auth ${event} successful`);
        }
    }

    /**
     * Log security event
     */
    static logSecurity(data: {
        event: 'rate_limit' | 'csrf_violation' | 'suspicious_activity' | 'permission_denied';
        userId?: string;
        ipAddress: string;
        details?: any;
    }) {
        const { event, userId, ipAddress, details } = data;

        logger.warn({
            type: 'security_event',
            event,
            userId,
            ipAddress,
            details,
        }, `Security: ${event}`);
    }

    /**
     * Log business event
     */
    static logBusiness(data: {
        event: 'apartment_created' | 'booking_confirmed' | 'payment_processed' | 'review_submitted';
        userId: string;
        metadata: Record<string, any>;
    }) {
        const { event, userId, metadata } = data;

        logger.info({
            type: 'business_event',
            event,
            userId,
            ...metadata,
        }, `Business: ${event}`);
    }

    /**
     * Log performance metric
     */
    static logPerformance(data: {
        metric: 'page_load' | 'api_latency' | 'database_query' | 'cache_hit';
        value: number;
        threshold?: number;
        context?: Record<string, any>;
    }) {
        const { metric, value, threshold, context } = data;

        if (threshold && value > threshold) {
            logger.warn({
                type: 'performance_metric',
                metric,
                value,
                threshold,
                ...context,
            }, `Performance: ${metric} exceeded threshold (${value}ms > ${threshold}ms)`);
        } else {
            logger.debug({
                type: 'performance_metric',
                metric,
                value,
                ...context,
            }, `Performance: ${metric} = ${value}ms`);
        }
    }

    /**
     * Generic debug log
     */
    static debug(message: string, context?: Record<string, any>) {
        logger.debug(context || {}, message);
    }

    /**
     * Generic info log
     */
    static info(message: string, context?: Record<string, any>) {
        logger.info(context || {}, message);
    }

    /**
     * Generic warning log
     */
    static warn(message: string, context?: Record<string, any>) {
        logger.warn(context || {}, message);
    }

    /**
     * Generic error log
     */
    static error(message: string, error?: Error | any, context?: Record<string, any>) {
        logger.error({
            ...context,
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
            } : error,
        }, message);
    }
}

// Export default logger instance
export { logger };
export default DevLogger;
