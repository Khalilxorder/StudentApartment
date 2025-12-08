import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security-middleware';

// Generate and store a CSRF token
export async function GET(req: NextRequest) {
  try {
    // Generate a CSRF token
    const csrfToken = generateCSRFToken();

    // Create response
    const response = NextResponse.json({
      csrfToken,
      success: true
    });

    // Set CSRF cookie
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error({ err: error }, 'Error generating CSRF token:');
    return NextResponse.json(
      { error: 'Failed to generate CSRF token', success: false },
      { status: 500 }
    );
  }
}
