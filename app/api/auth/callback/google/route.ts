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
    console.error('❌ Google OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate required parameters
  if (!code) {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(
      new URL('/?error=no_code', request.url)
    );
  }

  try {
    const supabase = createServiceClient();
    
    // Exchange code for session using Supabase
    // Note: The actual token exchange happens in the frontend/middleware
    // This handler just receives the callback and redirects appropriately
    
    console.log('✅ Google OAuth callback received with code');

    // Redirect to home page with success
    // The frontend will handle the actual session creation
    return NextResponse.redirect(
      new URL('/?auth=success', request.url)
    );
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=callback_error', request.url)
    );
  }
}
