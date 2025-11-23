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
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}