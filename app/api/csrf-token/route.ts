import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/security-middleware';

export async function GET(req: NextRequest) {
  try {
    const token = generateCSRFToken();

    return NextResponse.json(
      { token },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    logger.error({ err: error }, 'CSRF token generation error:');
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}