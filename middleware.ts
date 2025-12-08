import createMiddleware from 'next-intl/middleware';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityMiddleware } from './lib/security-middleware';

// Initialize next-intl middleware
const intlMiddleware = createMiddleware({
    locales: ['en', 'hu'],
    defaultLocale: 'en',
    localePrefix: 'as-needed'
});

export async function middleware(req: NextRequest) {
    // Apply security middleware first
    const securityResponse = await securityMiddleware(req);
    if (securityResponse) {
        return securityResponse;
    }

    // Determine if we should run intl middleware (skip for API and auth callback)
    const isApi = req.nextUrl.pathname.startsWith('/api');
    const isAuthCallback = req.nextUrl.pathname.startsWith('/auth/callback');

    // Create the response object
    // If API or auth callback, start with standard Next response. If Page, start with Intl response.
    let res = (isApi || isAuthCallback) ? NextResponse.next() : intlMiddleware(req);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return req.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    req.cookies.set({ name, value, ...options });
                    res.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    req.cookies.set({ name, value: '', ...options });
                    res.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Helper to get logic path (without locale)
    const getPath = (url: string) => {
        const path = new URL(url).pathname;
        return path.replace(/^\/(en|hu)/, '') || '/';
    };

    // Use raw pathname for API, but stripped pathname for route checks
    const currentPath = req.nextUrl.pathname;
    const logicPath = isApi ? currentPath : getPath(req.url);

    // If the user is not signed in and they are trying to access a protected route
    // Note: We check logicPath to handle /en/admin etc.
    if (!session && (logicPath.startsWith('/admin') ||
        logicPath.startsWith('/owner') ||
        logicPath.startsWith('/dashboard'))) {
        // Redirect them to the login page
        // Use relative path so next-intl handles locale
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // Enforce email verification
    if (session &&
        session.user.app_metadata.provider === 'email' &&
        !session.user.email_confirmed_at &&
        !logicPath.startsWith('/auth') &&
        !logicPath.startsWith('/api') &&
        !logicPath.startsWith('/login') &&
        !logicPath.startsWith('/signup')) {
        return NextResponse.redirect(new URL('/login?error=Please verify your email to continue.', req.url));
    }

    // Check if user has completed onboarding (only for protected routes)
    if (session) {
        // Skip onboarding check for certain paths
        const skipOnboardingCheck =
            logicPath.startsWith('/auth') ||
            logicPath.startsWith('/login') ||
            logicPath.startsWith('/signup') ||
            logicPath.startsWith('/onboarding') ||
            logicPath === '/' ||
            logicPath.startsWith('/api/');

        if (!skipOnboardingCheck) {
            // Fetch user profile to check onboarding status
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('preferences, role')
                .eq('id', session.user.id)
                .single();

            // If profile fetch fails (table doesn't exist or no row), allow access
            if (!profileError && profile) {
                // If onboarding not completed and not on onboarding page, redirect
                if (!profile.preferences?.onboarding_completed &&
                    !logicPath.startsWith('/onboarding')) {
                    // Only redirect to onboarding for owner routes
                    if (logicPath.startsWith('/owner')) {
                        return NextResponse.redirect(new URL('/onboarding', req.url));
                    }
                }

                // If user is owner but trying to access /dashboard, redirect to /owner
                if (profile.role === 'owner' && logicPath.startsWith('/dashboard')) {
                    return NextResponse.redirect(new URL('/owner', req.url));
                }

                // If user is student but trying to access /owner routes, redirect back
                if (profile.role !== 'owner' && profile.role !== 'admin' &&
                    logicPath.startsWith('/owner')) {
                    return NextResponse.redirect(new URL('/dashboard', req.url));
                }

                // If user is admin
                if (profile.role === 'admin' && !logicPath.startsWith('/admin')) {
                    return NextResponse.redirect(new URL('/admin', req.url));
                }
            }
        }
    }

    // Check role-based access for /owner routes
    if (session && logicPath.startsWith('/owner')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        // Only owners and admins can access /owner routes
        if (profile && profile.role !== 'owner' && profile.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
    }

    // Check admin access for /admin routes
    if (session && logicPath.startsWith('/admin')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        // Only admins can access /admin routes
        if (profile && profile.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
    }

    // If the user is signed in and they are trying to access the login or signup page
    if (session && (logicPath === '/login' || logicPath === '/signup')) {
        // If email not verified, allow them to see login page
        if (session.user.app_metadata.provider === 'email' && !session.user.email_confirmed_at) {
            return res;
        }

        // Check if MFA is enabled but not verified
        const mfaEnabled = session.user.user_metadata?.mfa_enabled === true;
        const mfaVerified = req.cookies.get('mfa_verified')?.value === 'true';

        // If MFA is enabled and not verified, only allow access to challenge page and API
        if (mfaEnabled && !mfaVerified) {
            if (
                !logicPath.startsWith('/auth/mfa-challenge') &&
                !logicPath.startsWith('/api/') &&
                !logicPath.startsWith('/auth/callback') &&
                !logicPath.startsWith('/_next')
            ) {
                const redirectUrl = new URL('/auth/mfa-challenge', req.url);
                redirectUrl.searchParams.set('next', logicPath);
                return NextResponse.redirect(redirectUrl);
            }
        } else if (mfaVerified && logicPath.startsWith('/auth/mfa-challenge')) {
            // If already verified and trying to access challenge, redirect to dashboard
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }

        // Redirect to appropriate dashboard based on role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role === 'owner' || profile?.role === 'admin') {
            return NextResponse.redirect(new URL('/owner', req.url));
        }
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Add CSRF token for GET requests to pages that need it
    if (req.method === 'GET' && !logicPath.startsWith('/api/')) {
        const csrfToken = crypto.randomUUID();
        req.headers.set('X-CSRF-Token', csrfToken);
        res.cookies.set('csrf_token', csrfToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        });
    }

    return res;
}

export const config = {
    // Matcher including all paths for i18n
    matcher: ['/((?!_next|.*\\..*).*)']
};
