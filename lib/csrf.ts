/**
 * CSRF Protection utilities
 * Generates and validates CSRF tokens for form submissions
 */

import { randomBytes } from 'crypto';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate a CSRF token against the expected token
 */
export function validateCSRFToken(token: string | null, expectedToken: string | null): boolean {
  if (!token || !expectedToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  if (token.length !== expectedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get CSRF token from headers or body
 */
export function getCSRFTokenFromRequest(
  headers: Headers,
  body?: any
): string | null {
  // Check X-CSRF-Token header first
  const headerToken = headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }

  // Check body if provided
  if (body && typeof body === 'object' && body.csrfToken) {
    return body.csrfToken;
  }

  return null;
}
