import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getFriendlyOAuthError } from '@/lib/auth-errors';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    const redirectUrl = new URL('/login', requestUrl.origin);
    const friendlyError = getFriendlyOAuthError(
      error_description || error,
      'Google'
    );
    redirectUrl.searchParams.set('error', friendlyError);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables are not configured for OAuth callback');
      const redirectUrl = new URL('/login', requestUrl.origin);
      redirectUrl.searchParams.set(
        'error',
        'Authentication is not configured. Please contact support.'
      );
      return NextResponse.redirect(redirectUrl);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    let sessionData:
      | Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>['data']
      | null = null;
    let exchangeError:
      | Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>['error']
      | Error
      | null = null;

    try {
      const result = await supabase.auth.exchangeCodeForSession(code);
      sessionData = result.data;
      exchangeError = result.error;
    } catch (err) {
      exchangeError = err as Error;
    }

    if (exchangeError) {
      console.error('Session exchange error:', exchangeError);
      if (exchangeError && typeof (exchangeError as any)?.message === 'string') {
        console.error('Error details:', {
          message: (exchangeError as any).message,
          status: (exchangeError as any).status,
          code: (exchangeError as any).code,
        });
      }

      const redirectUrl = new URL('/login', requestUrl.origin);
      redirectUrl.searchParams.set(
        'error',
        getFriendlyOAuthError(exchangeError, 'Google')
      );
      return NextResponse.redirect(redirectUrl);
    }

    console.log('Session exchange successful:', !!sessionData?.session);

    // Check if user profile exists, create if not
    if (sessionData?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, preferences')
        .eq('id', sessionData.user.id)
        .single();

      if (!profile && profileError?.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const fullName =
          sessionData.user.user_metadata?.full_name ||
          sessionData.user.user_metadata?.name ||
          '';
        
        await supabase.from('profiles').insert({
          id: sessionData.user.id,
          email: sessionData.user.email,
          full_name: fullName,
          avatar_url:
            sessionData.user.user_metadata?.avatar_url ||
            sessionData.user.user_metadata?.picture ||
            null,
          role: 'user',
          verified: false,
          preferences: {}
        });

        console.log('Created new profile for user:', sessionData.user.id);
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
