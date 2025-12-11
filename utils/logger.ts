// Logger utility - build-safe version for serverless deployment
// pino-pretty transport disabled to avoid worker thread issues

let logger: any;

try {
    const pino = require('pino');

    // Simple logger without pino-pretty transport (causes worker thread issues in serverless)
    const pinoLogger = pino({
        level: process.env.LOG_LEVEL || 'info',
        // No transport - use default JSON output in production
    });

    // Wrapper to support (message, data) signature which seems to be used in the codebase
    logger = {
        info: (arg1: any, arg2?: any, ...args: any[]) => {
            if (typeof arg1 === 'string' && typeof arg2 === 'object') {
                pinoLogger.info(arg2, arg1, ...args);
            } else {
                pinoLogger.info(arg1, arg2, ...args);
            }
        },
        error: (arg1: any, arg2?: any, ...args: any[]) => {
            if (typeof arg1 === 'string' && typeof arg2 === 'object') {
                pinoLogger.error(arg2, arg1, ...args);
            } else {
                pinoLogger.error(arg1, arg2, ...args);
            }
        },
        warn: (arg1: any, arg2?: any, ...args: any[]) => {
            if (typeof arg1 === 'string' && typeof arg2 === 'object') {
                pinoLogger.warn(arg2, arg1, ...args);
            } else {
                pinoLogger.warn(arg1, arg2, ...args);
            }
        },
        debug: (arg1: any, arg2?: any, ...args: any[]) => {
            if (typeof arg1 === 'string' && typeof arg2 === 'object') {
                pinoLogger.debug(arg2, arg1, ...args);
            } else {
                pinoLogger.debug(arg1, arg2, ...args);
            }
        },
    };
} catch {
    // Fallback console logger for build time
    logger = {
        info: (...args: any[]) => console.log('[INFO]', ...args),
        error: (...args: any[]) => console.error('[ERROR]', ...args),
        warn: (...args: any[]) => console.warn('[WARN]', ...args),
        debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
    };
}

export { logger };

export const breadcrumbs = {
    add: (message: string, data?: any) => {
        logger.info({ breadcrumb: message, ...data }, 'Breadcrumb added');
    },
    trackError: (error: Error) => {
        logger.error({ error: error.message, stack: error.stack }, 'Error tracked');
    },
    trackApiCall: (path: string, method: string, status: number) => {
        logger.info({ path, method, status }, 'API call tracked');
    },
};

export const performanceMonitor = {
    start: (label: string) => {
        console.time(label);
    },
    end: (label: string) => {
        console.timeEnd(label);
    },
    startMeasure: (label: string) => {
        const start = performance.now();
        return () => {
            const duration = performance.now() - start;
            return duration;
        };
    }
};

export const trackPageLoad = (pageName: string) => {
    logger.info({ page: pageName }, 'Page loaded');
};

export const trackUserAction = (action: string, data?: any) => {
    logger.info({ action, ...data }, 'User action tracked');
};
