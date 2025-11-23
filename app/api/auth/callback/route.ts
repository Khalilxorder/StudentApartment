import { NextRequest, NextResponse } from 'next/server';

/**
 * Generic OAuth callback handler
 * Delegates to provider-specific handlers
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'google';

  // Redirect to provider-specific callback
  if (provider === 'google') {
    return NextResponse.redirect(
      new URL(`/api/auth/callback/google?${searchParams.toString()}`, request.url)
    );
  }

  // Default error for unknown providers
  return NextResponse.redirect(
    new URL('/?error=unknown_provider', request.url)
  );
}
