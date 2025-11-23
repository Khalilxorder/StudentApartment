import pino from 'pino';

const pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    },
});

// Wrapper to support (message, data) signature which seems to be used in the codebase
export const logger = {
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
