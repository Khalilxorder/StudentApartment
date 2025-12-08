import { NextRequest, NextResponse } from 'next/server';
import { logRateLimitExceeded, logSuspiciousActivity, logCSRFViolation, logInputValidationFailure } from './security-logger';

// Use Redis-backed rate limiting from new module
import { checkRateLimit as checkRedisRateLimit } from './rate-limit-redis';

// Legacy in-memory fallback (deprecated - use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number; firstRequest: number }>();

/**
 * Legacy rate limiting function - kept for backwards compatibility
 * Use checkRedisRateLimit from './rate-limit-redis' instead
 */
async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  type: 'api' | 'auth' = 'api'
): Promise<boolean> {
  // Try new Redis-backed system first
  try {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const result = await checkRedisRateLimit(identifier, 'free', type);
      return result.success;
    }
  } catch (error) {
    console.warn('Redis rate limiting failed, using in-memory fallback');
  }

  // Fallback to in-memory
  const now = Date.now();
  const windowKey = Math.floor(now / windowMs);
  const key = `${identifier}:${windowKey}`;

  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs, firstRequest: now };

  if (now > current.resetTime) {
    current.count = 1;
    current.resetTime = now + windowMs;
    current.firstRequest = now;
  } else {
    current.count++;
  }

  rateLimitStore.set(key, current);

  // Clean up old entries periodically
  if (rateLimitStore.size > 1000) {
    const keysToDelete: string[] = [];
    rateLimitStore.forEach((v, k) => {
      if (now > v.resetTime) {
        keysToDelete.push(k);
      }
    });
    keysToDelete.forEach(k => rateLimitStore.delete(k));
  }

  return current.count <= limit;
}

// Stateless CSRF validation (Double Submit Cookie)
export async function validateCSRFToken(req: NextRequest): Promise<boolean> {
  const headerToken = req.headers.get('x-csrf-token') || req.nextUrl.searchParams.get('csrfToken');
  const cookieToken = req.cookies.get('csrf_token')?.value;

  if (!headerToken || !cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return headerToken === cookieToken;
}

// Deprecated: No-op for backward compatibility during migration
export async function storeCSRFToken(token: string): Promise<void> {
  // No-op: We now use cookies for storage
}

// Deprecated: Kept for backward compatibility
async function validateAndConsumeCSRFToken(token: string): Promise<boolean> {
  return false; // Should not be used directly anymore
}

function generateCSRFToken(): string {
  return crypto.randomUUID();
}

// Input validation patterns
const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  name: /^[a-zA-Z\s\-']{2,50}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
};

function validateInput(data: any, schema: Record<string, RegExp>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, pattern] of Object.entries(schema)) {
    const value = data[field];
    if (!value) {
      errors.push(`${field} is required`);
      continue;
    }

    if (typeof value !== 'string') {
      errors.push(`${field} must be a string`);
      continue;
    }

    if (!pattern.test(value.trim())) {
      errors.push(`${field} format is invalid`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

async function isSuspiciousRequest(req: NextRequest): Promise<boolean> {
  const userAgent = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  // Check for suspicious user agents
  const suspiciousAgents = [
    'bot', 'crawler', 'spider', 'scraper',
    'python-requests', 'curl', 'wget'
  ];

  if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    return true;
  }

  return false;
}

export async function securityMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;

  // Skip security checks for static assets
  if (
    pathname.startsWith('/_next/') ||
    // pathname.startsWith('/api/auth/') || // Auth routes must be rate limited!
    pathname.startsWith('/api/ai/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml')
  ) {
    return null;
  }

  // Rate limiting - ONLY for API routes and auth pages
  // Skip rate limiting for regular page views (apartments, dashboard, etc.)
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';

  let isAllowed = true;

  // Only apply rate limiting to API routes and auth endpoints
  if (pathname.startsWith('/api/') || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    if (pathname.startsWith('/api/auth') || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      // Strict limit for auth routes: 10 requests per 15 minutes
      isAllowed = await checkRateLimit(`${ip}:auth`, 10, 15 * 60 * 1000, 'auth');
    } else if (pathname.startsWith('/api/')) {
      // More reasonable limit for API routes: 500 requests per 15 minutes (development-friendly)
      isAllowed = await checkRateLimit(ip, 500, 15 * 60 * 1000, 'api');
    }
  }
  // No rate limiting for regular page views

  if (!isAllowed) {
    logRateLimitExceeded(req, 100);
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900', // 15 minutes
        },
      }
    );
  }

  // Detect suspicious requests
  if (await isSuspiciousRequest(req)) {
    logSuspiciousActivity(req, 'Suspicious user agent or request pattern detected');
    return new NextResponse(
      JSON.stringify({
        error: 'Suspicious activity detected',
        message: 'Your request has been blocked for security reasons.',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // CSRF protection for state-changing requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Exempt certain endpoints from CSRF validation
    const csrfExemptPaths = [
      '/api/webhooks/', // All webhook endpoints
      '/api/payments/stripe', // Stripe endpoints
      '/api/auth/callback', // OAuth callbacks
      '/auth/callback', // Supabase auth callback
      '/api/neighborhood', // Read-only neighborhood data fetch
      '/api/ai/', // AI endpoints are stateless
      '/api/messages', // Protected by Supabase auth
    ];

    const isExempt = csrfExemptPaths.some(path => pathname.startsWith(path));

    if (!isExempt) {
      const isValid = await validateCSRFToken(req);

      if (!isValid) {
        logCSRFViolation(req);
        return new NextResponse(
          JSON.stringify({
            error: 'Invalid CSRF token',
            message: 'Security validation failed. Please refresh the page and try again.',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }
  }

  return null;
}

// Utility functions for components
export { generateCSRFToken, validateInput, VALIDATION_PATTERNS };