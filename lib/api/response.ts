/**
 * Standardized API response helpers
 * Ensures consistent response format across all endpoints
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    metadata?: {
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Success response
 */
export function successResponse<T>(
    data: T,
    status: number = 200
): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
            },
        },
        { status }
    );
}

/**
 * Error response
 */
export function errorResponse(
    code: string,
    message: string,
    status: number = 400,
    details?: Record<string, any>
): NextResponse<ApiResponse> {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                details,
            },
            metadata: {
                timestamp: new Date().toISOString(),
            },
        },
        { status }
    );
}

/**
 * Handle validation errors from Zod
 */
export function validationErrorResponse(error: ZodError): NextResponse<ApiResponse> {
    const details = error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
    }));

    return errorResponse(
        'VALIDATION_ERROR',
        'Request validation failed',
        400,
        { validationErrors: details }
    );
}

/**
 * Common error responses
 */
export const Errors = {
    unauthorized: () => errorResponse('UNAUTHORIZED', 'Authentication required', 401),
    forbidden: () => errorResponse('FORBIDDEN', 'Access denied', 403),
    notFound: (resource = 'Resource') => errorResponse('NOT_FOUND', `${resource} not found`, 404),
    rateLimited: () => errorResponse('RATE_LIMITED', 'Too many requests. Please try again later', 429),
    serverError: (message = 'Internal server error') => errorResponse('SERVER_ERROR', message, 500),
    badRequest: (message: string) => errorResponse('BAD_REQUEST', message, 400),
};

/**
 * Wrap async handler with error handling
 */
export function withErrorHandling<T>(
    handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiResponse>> {
    return handler().catch((error: unknown) => {
        // Log error
        logger.error({ err: error }, 'API error');

        // Handle Zod validation errors
        if (error instanceof ZodError) {
            return validationErrorResponse(error);
        }

        // Handle known errors
        if (error instanceof Error && error.message === 'Unauthorized') {
            return Errors.unauthorized();
        }

        // Generic server error
        return Errors.serverError(
            process.env.NODE_ENV === 'development' && error instanceof Error
                ? error.message
                : 'An unexpected error occurred'
        );
    });
}
