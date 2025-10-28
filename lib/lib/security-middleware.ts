import { NextRequest, NextResponse } from 'next/server';
import { logRateLimitExceeded, logSuspiciousActivity, logCSRFViolation, logInputValidationFailure } from './security-logger';

// Rate limiting configuration with Redis support (when available)
let redisClient: any = null;

try {
  if (process.env.REDIS_URL) {
    const IORedis = require('ioredis');
    redisClient = new IORedis(process.env.REDIS_URL);
  } else if (process.env.UPSTASH_REDIS_REST_URL) {
    // For Upstash, we'd need their specific client, but for now use fallback
    console.warn('Upstash Redis detected but not fully configured, using in-memory rate limiting');
  }
} catch (error) {
  console.warn('Redis not available, using in-memory rate limiting');
}

// Enhanced in-memory rate limiting with better cleanup
const rateLimitStore = new Map<string, { count: number; resetTime: number; firstRequest: number }>();

async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();

  // Try Redis first if available
  if (redisClient) {
    try {
      const key = `ratelimit:${identifier}`;
      const current = await redisClient.get(key);

      if (!current) {
        // First request in window
        await redisClient.setex(key, Math.ceil(windowMs / 1000), '1');
        return true;
      }

      const count = parseInt(current);
      if (count >= limit) {
        return false;
      }

      await redisClient.incr(key);
      return true;
    } catch (error) {
      console.warn('Redis rate limiting failed, falling back to in-memory');
    }
  }

  // Fallback to in-memory rate limiting
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

  // Clean up old entries periodically (every 100 requests)
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

// CSRF token storage (enhanced with Redis support)
const csrfTokens = new Set<string>();

async function storeCSRFToken(token: string): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.setex(`csrf:${token}`, 3600, 'valid'); // 1 hour expiry
    } catch (error) {
      console.warn('Redis CSRF storage failed, using in-memory');
      csrfTokens.add(token);
    }
  } else {
    csrfTokens.add(token);
  }

  // Clean up old tokens (simple implementation)
  if (csrfTokens.size > 1000) {
    const tokensArray = Array.from(csrfTokens);
    tokensArray.slice(0, 100).forEach(token => csrfTokens.delete(token));
  }
}

async function validateAndConsumeCSRFToken(token: string): Promise<boolean> {
  if (redisClient) {
    try {
      const result = await redisClient.get(`csrf:${token}`);
      if (result) {
        await redisClient.del(`csrf:${token}`); // One-time use
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Redis CSRF validation failed, using in-memory');
    }
  }

  // Fallback to in-memory
  if (!csrfTokens.has(token)) {
    return false;
  }
  csrfTokens.delete(token); // One-time use
  return true;
}

function generateCSRFToken(): string {
  return crypto.randomUUID();
}

// Input validation patterns
const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  name: /^[a-zA-Z\s\-']{2,50}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
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

  // Check for rapid requests from same IP (basic implementation)
  const now = Date.now();
  const key = `requests:${ip}`;

  if (redisClient) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, 60); // 1 minute window
      }
      if (count > 100) { // More than 100 requests per minute
        return true;
      }
    } catch (error) {
      console.warn('Redis suspicious request check failed');
    }
  }

  return false;
}

export async function securityMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;

  // Skip security checks for static assets and API routes that handle their own security
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/ai/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml')
  ) {
    return null;
  }

  // Rate limiting
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
  let isAllowed = await checkRateLimit(ip, 100, 15 * 60 * 1000); // 100 requests per 15 minutes

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
    const csrfToken = req.headers.get('x-csrf-token') || req.nextUrl.searchParams.get('csrfToken');

    if (!csrfToken || !(await validateAndConsumeCSRFToken(csrfToken))) {
      logCSRFViolation(req);
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid CSRF token',
          message: 'Security validation failed.',
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

  // Input validation for API routes
  if (pathname.startsWith('/api/') && req.method === 'POST') {
    try {
      const body = await req.json();

      // Validate based on endpoint
      let validationSchema: Record<string, RegExp> = {};

      if (pathname === '/api/auth/signup' || pathname === '/api/auth/login') {
        validationSchema = {
          email: VALIDATION_PATTERNS.email,
          password: VALIDATION_PATTERNS.password,
        };
      } else if (pathname === '/api/apartments/search') {
        // Allow flexible search parameters
        validationSchema = {};
      } else if (pathname.includes('/apartments/') && req.method === 'POST') {
        validationSchema = {
          title: /^[a-zA-Z0-9\s\-',.]{10,200}$/,
          description: /^[a-zA-Z0-9\s\-',.!?]{50,2000}$/,
          price: /^\d+(\.\d{2})?$/,
          location: /^[a-zA-Z0-9\s\-',.]{5,100}$/,
        };
      }

      if (Object.keys(validationSchema).length > 0) {
        const validation = validateInput(body, validationSchema);

        if (!validation.isValid) {
          validation.errors.forEach(error => {
            logInputValidationFailure(req, 'form_field', error);
          });
          return new NextResponse(
            JSON.stringify({
              error: 'Validation failed',
              message: 'Please check your input data.',
              details: validation.errors,
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
      }
    } catch (error) {
      // If body parsing fails, continue (might be form data)
    }
  }

  // Add CSRF token for GET requests to pages that need it
  if (req.method === 'GET' && !pathname.startsWith('/api/')) {
    const csrfToken = crypto.randomUUID();
    await storeCSRFToken(csrfToken);
    req.headers.set('X-CSRF-Token', csrfToken);
  }

  return null;
}

// Utility functions for components
export { generateCSRFToken, validateInput, VALIDATION_PATTERNS };