import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logInputValidationFailure } from './security-logger';

export type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

/**
 * Enhanced API validation wrapper with comprehensive error handling
 */
export function withValidation<T extends z.ZodSchema>(
  schema: T,
  handler: (req: NextRequest, validatedData: z.infer<T>, context?: any) => Promise<NextResponse> | NextResponse
): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      let body: unknown;

      // Parse request body based on content type
      const contentType = req.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          body = await req.json();
        } catch (error) {
          return NextResponse.json(
            {
              error: 'Invalid JSON in request body',
              code: 'INVALID_JSON'
            },
            { status: 400 }
          );
        }
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const data: Record<string, FormDataEntryValue> = {};
        for (const [key, value] of formData.entries()) {
          data[key] = value;
        }
        body = data;
      } else {
        // For GET requests or requests without body, use URL params
        const url = new URL(req.url);
        body = Object.fromEntries(url.searchParams.entries());
      }

      // Validate input with Zod schema
      const validation = schema.safeParse(body);

      if (!validation.success) {
        const errors = validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }));

        // Log validation failure for security monitoring
        logInputValidationFailure(
          req,
          errors[0].field,
          `Multiple validation errors: ${errors.map(e => e.message).join(', ')}`
        );

        return NextResponse.json(
          {
            error: 'Validation failed',
            details: errors,
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        );
      }

      // Call the handler with validated data
      return await handler(req, validation.data, context);

    } catch (error: any) {
      console.error('API validation wrapper error:', error);

      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Rate limiting wrapper for API routes
 */
export function withRateLimit(
  handler: ApiHandler,
  options: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  }
): ApiHandler {
  const { windowMs, maxRequests, skipSuccessfulRequests = false, skipFailedRequests = false } = options;

  // Simple in-memory rate limiting (use Redis in production)
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (req: NextRequest, context?: any) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowKey = Math.floor(now / windowMs);
    const key = `${ip}:${windowKey}`;

    const current = requests.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > current.resetTime) {
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count++;
    }

    requests.set(key, current);

    // Clean up old entries
    if (Math.random() < 0.01) {
      const keysToDelete: string[] = [];
      requests.forEach((v, k) => {
        if (now > v.resetTime) {
          keysToDelete.push(k);
        }
      });
      keysToDelete.forEach(k => requests.delete(k));
    }

    if (current.count > maxRequests) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString()
          }
        }
      );
    }

    const response = await handler(req, context);

    // Optionally skip rate limiting for certain response types
    if (
      (skipSuccessfulRequests && response.status < 400) ||
      (skipFailedRequests && response.status >= 400)
    ) {
      // Reset the counter for this window
      current.count = Math.max(0, current.count - 1);
      requests.set(key, current);
    }

    return response;
  };
}

/**
 * Combined validation and rate limiting wrapper
 */
export function withApiProtection<T extends z.ZodSchema>(
  schema: T,
  handler: (req: NextRequest, validatedData: z.infer<T>, context?: any) => Promise<NextResponse> | NextResponse,
  rateLimitOptions?: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  }
): ApiHandler {
  let protectedHandler = withValidation(schema, handler);

  if (rateLimitOptions) {
    protectedHandler = withRateLimit(protectedHandler, rateLimitOptions);
  }

  return protectedHandler;
}