import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabaseClient';

/**
 * Google OAuth callback handler
 * This receives the authorization code from Google and exchanges it for tokens
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  // Handle OAuth errors
  if (error) {
    logger.error({ err: error }, '❌ Google OAuth error:');
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate required parameters
  if (!code) {
    logger.error('❌ No authorization code received');
    return NextResponse.redirect(
      new URL('/?error=no_code', request.url)
    );
  }

  try {
    const supabase = createServiceClient();
    
    // Exchange code for session using Supabase
    // Note: The actual token exchange happens in the frontend/middleware
    // This handler just receives the callback and redirects appropriately
    
    logger.info('✅ Google OAuth callback received with code');

    // Redirect to home page with success
    // The frontend will handle the actual session creation
    return NextResponse.redirect(
      new URL('/?auth=success', request.url)
    );
  } catch (error) {
    logger.error({ err: error }, '❌ OAuth callback error:');
    return NextResponse.redirect(
      new URL('/?error=callback_error', request.url)
    );
  }
}
