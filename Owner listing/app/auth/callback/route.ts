import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

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
        .select('id, preferences')
        .eq('id', data.user.id)
        .single();

      if (!profile && profileError?.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || '';
        
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
          role: 'user',
          verified: false,
          preferences: {}
        });

        console.log('Created new profile for user:', data.user.id);
      }

      // Check if user has completed onboarding (stored in preferences)
      const hasCompletedOnboarding = profile?.preferences?.onboarding_completed === true;

      // Redirect based on onboarding status
      if (hasCompletedOnboarding) {
        // User has completed onboarding, redirect to dashboard
        const redirectUrl = new URL('/dashboard', requestUrl.origin);
        return NextResponse.redirect(redirectUrl);
      } else {
        // New user or hasn't completed onboarding, redirect to onboarding
        const redirectUrl = new URL('/onboarding', requestUrl.origin);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // URL to redirect to after sign in process completes (fallback)
  const redirectUrl = new URL('/onboarding', requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}