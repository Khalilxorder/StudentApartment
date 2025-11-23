'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import type { User } from '@supabase/supabase-js';
import UserProfileDropdown from './UserProfileDropdown';
import MobileMenu from './MobileMenu';

type UserRole = 'student' | 'owner' | 'admin';

export interface UserProfileSummary {
  id: string;
  role: UserRole;
  fullName?: string;
  avatarUrl?: string;
  university?: string;
}

// SVG Logo Component
const Logo = ({ className }: { className?: string }) => (
  <svg
    width="54"
    height="43"
    viewBox="0 0 54 43"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="11" y="18" width="32" height="25" rx="1" fill="#823D00" />
    <path
      d="M25.5675 1.47034C26.3525 0.664564 27.6475 0.664563 28.4325 1.47034L47.0744 20.6043C48.309 21.8716 47.4111 24 45.6418 24H8.35816C6.58888 24 5.69098 21.8716 6.92564 20.6043L25.5675 1.47034Z"
      fill="url(#paint0_linear_32_2)"
    />
    <path
      d="M23 34C23 33.4477 23.4477 33 24 33H30C30.5523 33 31 33.4477 31 34V42C31 42.5523 30.5523 43 30 43H24C23.4477 43 23 42.5523 23 42V34Z"
      fill="#482100"
    />
    <rect x="24" y="12" width="6" height="6" rx="1" fill="#AE5100" />
    <defs>
      <linearGradient
        id="paint0_linear_32_2"
        x1="27"
        y1="0"
        x2="27"
        y2="32"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#823D00" />
        <stop offset="1" stopColor="#1C0D00" />
      </linearGradient>
    </defs>
  </svg>
);

export default function UserAuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        const summary = await loadProfile(nextUser);
        setProfile(summary);
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        if (nextUser) {
          loadProfile(nextUser).then(setProfile).catch(() => setProfile(null));
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Navigate to home page
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
          <a href="/" onClick={handleLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <Logo className="h-10 w-auto" />
            <h1 className="text-gray-900 font-bold text-lg">Student Apartments</h1>
          </a>
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div suppressHydrationWarning className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
          <a href="/" onClick={handleLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <Logo className="h-10 w-auto" />
            <h1 className="text-gray-900 font-bold text-lg">Student Apartments</h1>
          </a>



          {user ? (
            // User is signed in
            <UserProfileDropdown user={user} profile={profile} />
          ) : (
            // User is not signed in
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSignIn}
                className="hidden rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:inline-flex"
              >
                Sign In
              </button>
              <button
                onClick={handleSignUp}
                className="inline-flex items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        user={user}
        profile={profile}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}

async function loadProfile(user: User): Promise<UserProfileSummary | null> {
  try {
    // Get metadata from auth
    const metadata = user.user_metadata ?? {};
    const fallbackAvatar = (metadata.avatar_url ?? metadata.picture) as string | undefined;
    const fallbackName = (metadata.full_name ?? metadata.name) as string | undefined;
    const email = user.email ?? '';

    // Try to get user record from public.users
    let { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .maybeSingle();

    // If user record doesn't exist, create it (use upsert to handle existing records)
    if (!userRecord && !userError) {
      console.log('Creating/updating user record for', user.id);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: email,
          role: 'student', // Default role
          email_verified: !!user.email_confirmed_at,
        }, { onConflict: 'id' })
        .select('role, email')
        .single();

      if (insertError) {
        console.error('Failed to create user record', insertError);
        // Return basic profile from auth metadata
        return {
          id: user.id,
          role: 'student',
          fullName: fallbackName ?? undefined,
          avatarUrl: fallbackAvatar,
        };
      }
      userRecord = newUser;
    }

    if (userError) {
      console.warn('Error loading user record', userError);
      // Return basic profile from auth metadata
      return {
        id: user.id,
        role: 'student',
        fullName: fallbackName ?? undefined,
        avatarUrl: fallbackAvatar,
      };
    }

    const role = (userRecord?.role as UserRole) ?? 'student';

    if (role === 'owner') {
      let { data: ownerProfile } = await supabase
        .from('profiles_owner')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      // Auto-create owner profile if missing (use upsert)
      if (!ownerProfile) {
        const { data: newProfile } = await supabase
          .from('profiles_owner')
          .upsert({
            id: user.id,
            user_id: user.id,
            full_name: fallbackName ?? '',
          }, { onConflict: 'id' })
          .select('full_name')
          .single();
        ownerProfile = newProfile;
      }

      return {
        id: user.id,
        role,
        fullName: ownerProfile?.full_name ?? fallbackName ?? undefined,
        avatarUrl: fallbackAvatar,
      };
    }

    if (role === 'student') {
      let { data: studentProfile } = await supabase
        .from('profiles_student')
        .select('full_name, university')
        .eq('id', user.id)
        .maybeSingle();

      // Auto-create student profile if missing (use upsert)
      if (!studentProfile) {
        const { data: newProfile } = await supabase
          .from('profiles_student')
          .upsert({
            id: user.id,
            user_id: user.id,
            full_name: fallbackName ?? '',
          }, { onConflict: 'id' })
          .select('full_name, university')
          .single();
        studentProfile = newProfile;
      }

      return {
        id: user.id,
        role,
        fullName: studentProfile?.full_name ?? fallbackName ?? undefined,
        avatarUrl: fallbackAvatar,
        university: studentProfile?.university ?? undefined,
      };
    }

    return {
      id: user.id,
      role,
      fullName: fallbackName ?? undefined,
      avatarUrl: fallbackAvatar,
    };
  } catch (error) {
    console.error('Failed to load user profile summary', error);
    // Return basic profile even on error
    const metadata = user.user_metadata ?? {};
    return {
      id: user.id,
      role: 'student',
      fullName: (metadata.full_name ?? metadata.name) as string | undefined,
      avatarUrl: (metadata.avatar_url ?? metadata.picture) as string | undefined,
    };
  }
}
