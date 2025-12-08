/**
 * Human-Readable Error System
 * 
 * Transforms technical errors into user-friendly messages
 * with developer context in non-production environments
 */

export interface AppError {
    code: string;
    message: string;
    userMessage: string;
    details?: any;
    statusCode: number;
    timestamp: string;
    requestId?: string;
}

export class ErrorCatalog {
    private static errors: Record<string, { user: string; dev: string; status: number }> = {
        // Authentication Errors
        'AUTH_INVALID_TOKEN': {
            user: 'Your session has expired. Please log in again.',
            dev: 'JWT token is invalid or expired',
            status: 401,
        },
        'AUTH_UNAUTHORIZED': {
            user: 'You don\'t have permission to access this resource.',
            dev: 'User lacks required role or permission',
            status: 403,
        },
        'AUTH_CSRF_INVALID': {
            user: 'Security validation failed. Please refresh the page and try again.',
            dev: 'CSRF token expired or missing',
            status: 403,
        },

        // API & Rate Limiting
        'RATE_LIMIT_EXCEEDED': {
            user: 'Too many requests. Please wait a moment and try again.',
            dev: 'Rate limit exceeded for this IP/user',
            status: 429,
        },
        'API_QUOTA_EXCEEDED': {
            user: 'You\'ve reached your API usage limit for this billing period.',
            dev: 'Monthly API quota exceeded for tenant',
            status: 429,
        },

        // Maps & External Services
        'MAPS_API_LIMIT': {
            user: 'Map features are temporarily unavailable. We\'re working on it!',
            dev: 'Google Maps API quota exceeded or key invalid',
            status: 503,
        },
        'MAPS_API_KEY_INVALID': {
            user: 'Map location services are currently unavailable.',
            dev: 'NEXT_PUBLIC_MAPS_API_KEY is missing or invalid',
            status: 503,
        },

        // AI & Search
        'AI_SERVICE_ERROR': {
            user: 'AI search is temporarily unavailable. Try basic search instead.',
            dev: 'Google Gemini API error or quota exceeded',
            status: 503,
        },
        'AI_TIMEOUT': {
            user: 'The AI took too long to respond. Please try a simpler search.',
            dev: 'AI API timeout after 30 seconds',
            status: 504,
        },
        'SEARCH_INDEX_UNAVAILABLE': {
            user: 'Search is temporarily unavailable. Please try again shortly.',
            dev: 'Meilisearch connection failed',
            status: 503,
        },

        // Database
        'DB_CONNECTION_ERROR': {
            user: 'We\'re experiencing technical difficulties. Please try again in a moment.',
            dev: 'Database connection failed (Supabase)',
            status: 503,
        },
        'DB_TIMEOUT': {
            user: 'The request took too long. Please try again.',
            dev: 'Database query timeout',
            status: 504,
        },
        'DB_CONSTRAINT_VIOLATION': {
            user: 'This action conflicts with existing data. Please check your input.',
            dev: 'Database constraint violation (unique, foreign key, etc.)',
            status: 409,
        },

        // Payments
        'PAYMENT_FAILED': {
            user: 'Payment could not be processed. Please check your card details.',
            dev: 'Stripe payment intent failed',
            status: 402,
        },
        'PAYMENT_CARD_DECLINED': {
            user: 'Your card was declined. Please try another payment method.',
            dev: 'Stripe card declined',
            status: 402,
        },
        'STRIPE_WEBHOOK_INVALID': {
            user: 'Payment notification failed. Our team has been notified.',
            dev: 'Stripe webhook signature verification failed',
            status: 400,
        },

        // File Upload
        'FILE_TOO_LARGE': {
            user: 'File is too large. Maximum size is 10MB.',
            dev: 'File exceeds MAX_FILE_SIZE',
            status: 413,
        },
        'FILE_TYPE_INVALID': {
            user: 'This file type is not supported. Please use JPG, PNG, or PDF.',
            dev: 'File MIME type not in allowed list',
            status: 415,
        },

        // Validation
        'VALIDATION_ERROR': {
            user: 'Please check your input and try again.',
            dev: 'Input validation failed',
            status: 400,
        },
        'MISSING_REQUIRED_FIELD': {
            user: 'Please fill in all required fields.',
            dev: 'Required field missing in request body',
            status: 400,
        },

        // Generic
        'INTERNAL_ERROR': {
            user: 'Something went wrong on our end. We\'re looking into it.',
            dev: 'Unhandled exception in application code',
            status: 500,
        },
        'SERVICE_UNAVAILABLE': {
            user: 'This service is temporarily unavailable. Please try again later.',
            dev: 'Dependent service unavailable',
            status: 503,
        },
    };

    /**
     * Create a formatted error response
     */
    static createError(
        code: string,
        details?: any,
        requestId?: string
    ): AppError {
        const errorDef = this.errors[code] || {
            user: 'An unexpected error occurred.',
            dev: 'Unknown error code',
            status: 500,
        };

        const isDev = process.env.NODE_ENV !== 'production';

        return {
            code,
            message: isDev ? errorDef.dev : errorDef.user, // Show dev message in dev
            userMessage: errorDef.user,
            details: isDev ? details : undefined, // Only show details in dev
            statusCode: errorDef.status,
            timestamp: new Date().toISOString(),
            requestId,
        };
    }

    /**
     * Map common error types to our error codes
     */
    static fromError(error: any, requestId?: string): AppError {
        // Supabase errors
        if (error?.code === 'PGRST116') {
            return this.createError('DB_CONNECTION_ERROR', error, requestId);
        }

        // Rate limit errors
        if (error?.message?.includes('rate limit')) {
            return this.createError('RATE_LIMIT_EXCEEDED', error, requestId);
        }

        // Stripe errors
        if (error?.type === 'StripeCardError') {
            return this.createError('PAYMENT_CARD_DECLINED', error, requestId);
        }

        // Default to internal error
        return this.createError('INTERNAL_ERROR', error, requestId);
    }
}

/**
 * Error response helper for API routes
 */
export function errorResponse(
    code: string,
    details?: any,
    requestId?: string
): Response {
    const error = ErrorCatalog.createError(code, details, requestId);

    return new Response(
        JSON.stringify({
            error: {
                code: error.code,
                message: error.userMessage, // Always use user-friendly message
                ...(process.env.NODE_ENV !== 'production' && {
                    devMessage: error.message,
                    details: error.details,
                }),
                timestamp: error.timestamp,
                requestId: error.requestId,
            },
        }),
        {
            status: error.statusCode,
            headers: {
                'Content-Type': 'application/json',
                ...(error.requestId && { 'X-Request-ID': error.requestId }),
            },
        }
    );
}

/**
 * Middleware to add request IDs
 */
export function withRequestId(handler: Function) {
    return async (req: Request, ...args: any[]) => {
        const requestId = crypto.randomUUID();

        // Add to request object if possible
        (req as Request & { requestId?: string }).requestId = requestId;

        try {
            return await handler(req, ...args);
        } catch (error) {
            console.error('[Request Error]', {
                requestId,
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
            });

            return errorResponse('INTERNAL_ERROR', error, requestId);
        }
    };
}
