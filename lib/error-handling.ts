/**
 * Enhanced Error Handling Utilities
 * Provides structured error handling with proper logging, monitoring, and user-friendly messages
 */

import { NextResponse } from 'next/server';

// Error types for categorization
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',       // Expected errors (validation, not found)
  MEDIUM = 'MEDIUM', // Authentication, authorization issues
  HIGH = 'HIGH',     // Database errors, external API failures
  CRITICAL = 'CRITICAL', // System failures, security breaches
}

// Custom application error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }
}

// Pre-configured error factory functions
export const ErrorFactory = {
  validation: (message: string, context?: Record<string, any>) =>
    new AppError(message, ErrorType.VALIDATION, ErrorSeverity.LOW, 400, true, context),

  authentication: (message: string = 'Authentication required', context?: Record<string, any>) =>
    new AppError(message, ErrorType.AUTHENTICATION, ErrorSeverity.MEDIUM, 401, true, context),

  authorization: (message: string = 'Insufficient permissions', context?: Record<string, any>) =>
    new AppError(message, ErrorType.AUTHORIZATION, ErrorSeverity.MEDIUM, 403, true, context),

  notFound: (resource: string = 'Resource', context?: Record<string, any>) =>
    new AppError(`${resource} not found`, ErrorType.NOT_FOUND, ErrorSeverity.LOW, 404, true, context),

  rateLimit: (message: string = 'Rate limit exceeded', retryAfter?: number) =>
    new AppError(message, ErrorType.RATE_LIMIT, ErrorSeverity.MEDIUM, 429, true, { retryAfter }),

  database: (message: string, context?: Record<string, any>) =>
    new AppError(message, ErrorType.DATABASE, ErrorSeverity.HIGH, 500, true, context),

  externalApi: (service: string, message: string, context?: Record<string, any>) =>
    new AppError(
      `${service} API error: ${message}`,
      ErrorType.EXTERNAL_API,
      ErrorSeverity.HIGH,
      502,
      true,
      context
    ),

  internal: (message: string = 'Internal server error', context?: Record<string, any>) =>
    new AppError(message, ErrorType.INTERNAL, ErrorSeverity.CRITICAL, 500, false, context),
};

// Error logger with different severity levels
export class ErrorLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static log(error: Error | AppError, additionalContext?: Record<string, any>) {
    const isAppError = error instanceof AppError;

    const errorLog = {
      timestamp: isAppError ? error.timestamp : new Date().toISOString(),
      message: error.message,
      type: isAppError ? error.type : ErrorType.INTERNAL,
      severity: isAppError ? error.severity : ErrorSeverity.HIGH,
      stack: this.isDevelopment ? error.stack : undefined,
      context: {
        ...(isAppError ? error.context : {}),
        ...additionalContext,
      },
    };

    // Log to console with color coding in development
    if (this.isDevelopment) {
      console.error('🔴 ERROR:', errorLog);
    } else {
      // In production, use structured logging
      console.error(JSON.stringify(errorLog));
    }

    // Send to monitoring service (e.g., Sentry, DataDog)
    this.sendToMonitoring(errorLog);
  }

  private static sendToMonitoring(errorLog: any) {
    // Integration with error monitoring services
    // Example: Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Sentry.captureException(errorLog);
    }

    // Example: Custom monitoring endpoint
    if (process.env.MONITORING_ENDPOINT) {
      fetch(process.env.MONITORING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog),
      }).catch(err => console.error('Failed to send error to monitoring:', err));
    }
  }
}

// API error response formatter
export function formatErrorResponse(error: Error | AppError, includeStack: boolean = false) {
  const isAppError = error instanceof AppError;

  const response = {
    error: {
      message: error.message,
      type: isAppError ? error.type : ErrorType.INTERNAL,
      timestamp: isAppError ? error.timestamp : new Date().toISOString(),
      ...(includeStack && { stack: error.stack }),
      ...(isAppError && error.context && { context: error.context }),
    },
  };

  return response;
}

// Next.js API error handler
export function handleApiError(error: Error | AppError, endpoint?: string): NextResponse {
  // Log the error
  ErrorLogger.log(error, { endpoint });

  // Determine status code
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  // Format response (include stack only in development)
  const response = formatErrorResponse(error, process.env.NODE_ENV === 'development');

  // Add rate limit headers if applicable
  if (error instanceof AppError && error.type === ErrorType.RATE_LIMIT && error.context?.retryAfter) {
    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Retry-After': error.context.retryAfter.toString(),
      },
    });
  }

  return NextResponse.json(response, { status: statusCode });
}

// Async error wrapper for API routes
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  endpoint?: string
): (...args: T) => Promise<R | NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(
        error instanceof AppError ? error : new Error(String(error)),
        endpoint
      );
    }
  };
}

// Validation helper
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw ErrorFactory.validation(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields, providedFields: Object.keys(data) }
    );
  }
}

// Database error parser (for Supabase/PostgreSQL)
export function parseDatabaseError(error: any): AppError {
  // PostgreSQL error codes
  const errorCode = error.code || error.error_code;
  
  switch (errorCode) {
    case '23505': // unique_violation
      return ErrorFactory.validation('Duplicate entry exists', { 
        detail: error.detail,
        constraint: error.constraint_name 
      });
    
    case '23503': // foreign_key_violation
      return ErrorFactory.validation('Referenced record does not exist', { 
        detail: error.detail 
      });
    
    case '23502': // not_null_violation
      return ErrorFactory.validation('Required field is missing', { 
        column: error.column_name 
      });
    
    case '42P01': // undefined_table
      return ErrorFactory.database('Database table not found', { 
        table: error.table_name 
      });
    
    default:
      return ErrorFactory.database(
        error.message || 'Database operation failed',
        { code: errorCode, detail: error.detail }
      );
  }
}

// Export commonly used patterns
export const tryAsync = async <T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw ErrorFactory.internal(
      errorMessage || 'Operation failed',
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
};
