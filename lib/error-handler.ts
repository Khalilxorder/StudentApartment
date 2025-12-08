import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';

/**
 * Enterprise Error Handler
 * Centralized error handling with Sentry integration and structured logging
 */

export interface ErrorContext {
    userId?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    [key: string]: any;
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context?: ErrorContext;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true,
        context?: ErrorContext
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle errors with logging and Sentry reporting
 */
export function handleError(error: Error | AppError, context?: ErrorContext): void {
    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : 500;
    const isOperational = isAppError ? error.isOperational : false;
    const errorContext = isAppError ? error.context : context;

    // Log the error
    logger.error({
        err: error,
        message: error.message,
        statusCode,
        isOperational,
        ...errorContext,
    }, 'Error occurred');

    // Report to Sentry (only non-operational errors or 5xx)
    if (!isOperational || statusCode >= 500) {
        Sentry.captureException(error, {
            contexts: {
                error: errorContext as Record<string, unknown>,
            },
            tags: {
                statusCode: statusCode.toString(),
                isOperational: isOperational.toString(),
            },
        });
    }
}

/**
 * Common error classes for different scenarios
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource', context?: ErrorContext) {
        super(`${resource} not found`, 404, true, context);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, 400, true, context);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized', context?: ErrorContext) {
        super(message, 401, true, context);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access forbidden', context?: ErrorContext) {
        super(message, 403, true, context);
    }
}

export class ConflictError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, 409, true, context);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests', context?: ErrorContext) {
        super(message, 429, true, context);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error', context?: ErrorContext) {
        super(message, 500, false, context);
    }
}

/**
 * Async wrapper to catch errors in async functions
 */
export function catchAsync<T>(
    fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
    return async (...args: any[]): Promise<T> => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error as Error);
            throw error;
        }
    };
}
