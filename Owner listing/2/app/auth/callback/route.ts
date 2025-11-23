import { createClient } from '@/utils/supabaseClient';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    const redirectUrl = new URL('/login', requestUrl.origin);
    redirectUrl.searchParams.set('error', error_description || 'Authentication failed');
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = createClient();

    // Log the code for debugging
    console.log('Received OAuth code:', code.substring(0, 20) + '...');

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Session exchange error:', exchangeError);
      console.error('Error details:', {
        message: exchangeError.message,
        status: exchangeError.status,
        code: exchangeError.code
      });

      const redirectUrl = new URL('/login', requestUrl.origin);
      redirectUrl.searchParams.set('error', 'Failed to complete sign in');
      return NextResponse.redirect(redirectUrl);
    }

    console.log('Session exchange successful:', !!data.session);

    // Check if user profile exists, create if not
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!profile && !profileError) {
        // Create profile for new user
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
          avatar_url: data.user.user_metadata?.avatar_url || null,
          role: 'user',
        });
      }
    }
  }

  // URL to redirect to after sign in process completes
  const redirectUrl = new URL('/', requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}