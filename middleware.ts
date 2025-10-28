import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityMiddleware } from './lib/security-middleware';

export async function middleware(req: NextRequest) {
  // Apply security middleware first (includes rate limiting and security headers)
  const securityResponse = await securityMiddleware(req);
  if (securityResponse) {
    return securityResponse;
  }

  const res = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If the user is not signed in and they are trying to access a protected route
  if (!session && (req.nextUrl.pathname.startsWith('/admin') || 
                    req.nextUrl.pathname.startsWith('/owner') || 
                    req.nextUrl.pathname.startsWith('/dashboard'))) {
    // Redirect them to the login page
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Check if user has completed onboarding (only for protected routes)
  if (session) {
    // Check if user has completed onboarding (only for protected routes)
    if (!req.nextUrl.pathname.startsWith('/auth') && 
        !req.nextUrl.pathname.startsWith('/login') &&
        req.nextUrl.pathname !== '/onboarding' &&
        req.nextUrl.pathname !== '/') {
      
      // Fetch user profile to check onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences, role')
        .eq('id', session.user.id)
        .single();

      // If onboarding not completed, redirect to onboarding
      if (profile && !profile.preferences?.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }

      // If user is owner but trying to access /dashboard, redirect to /owner
      if (profile?.role === 'owner' && req.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/owner', req.url));
      }

      // If user is student but trying to access /owner routes, redirect back
      if (profile?.role !== 'owner' && req.nextUrl.pathname.startsWith('/owner')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // If user is admin
      if (profile?.role === 'admin' && !req.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }
  }

  // Check role-based access for /owner routes
  if (session && req.nextUrl.pathname.startsWith('/owner')) {
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
  if (session && req.nextUrl.pathname.startsWith('/admin')) {
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
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
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

  return res;
}

export const config = {
  // Run middleware on all protected routes and API routes
  matcher: ['/admin/:path*', '/owner/:path*', '/dashboard/:path*', '/login', '/signup', '/api/:path*'],
};