import { NextResponse } from 'next/server';

/**
 * Standardized API Response Formats
 * Ensures consistent response structure across all API endpoints
 */

export interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        [key: string]: any;
    };
}

export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
        statusCode: number;
    };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a success response
 */
export function successResponse<T>(
    data: T,
    message?: string,
    meta?: ApiSuccessResponse['meta'],
    status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
            message,
            meta,
        },
        { status }
    );
}

/**
 * Create an error response
 */
export function errorResponse(
    message: string,
    code: string = 'ERROR',
    statusCode: number = 500,
    details?: any
): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                details,
                statusCode,
            },
        },
        { status: statusCode }
    );
}

/**
 * Common error responses
 */
export const ApiErrors = {
    notFound: (resource: string = 'Resource') =>
        errorResponse(`${resource} not found`, 'NOT_FOUND', 404),

    badRequest: (message: string, details?: any) =>
        errorResponse(message, 'BAD_REQUEST', 400, details),

    unauthorized: (message: string = 'Unauthorized') =>
        errorResponse(message, 'UNAUTHORIZED', 401),

    forbidden: (message: string = 'Access forbidden') =>
        errorResponse(message, 'FORBIDDEN', 403),

    conflict: (message: string) =>
        errorResponse(message, 'CONFLICT', 409),

    tooManyRequests: (message: string = 'Too many requests') =>
        errorResponse(message, 'TOO_MANY_REQUESTS', 429),

    internalError: (message: string = 'Internal server error') =>
        errorResponse(message, 'INTERNAL_ERROR', 500),

    serviceUnavailable: (message: string = 'Service temporarily unavailable') =>
        errorResponse(message, 'SERVICE_UNAVAILABLE', 503),
};
