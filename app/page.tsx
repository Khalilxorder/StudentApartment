'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import LandingPage from '@/components/LandingPage';

export default function HomePage() {
  const router = useRouter();

  // Redirect logic removed to allow access to landing page
  // useEffect(() => {
  //   async function checkAuth() {
  //     try {
  //       const { data: { user } } = await supabase.auth.getUser();
  //
  //       if (user) {
  //         // Get user role
  //         const { data: userRecord } = await supabase
  //           .from('users')
  //           .select('role')
  //           .eq('id', user.id)
  //           .maybeSingle();
  //
  //         const role = userRecord?.role;
  //
  //         // Redirect based on role
  //         if (role === 'owner') {
  //           router.push('/owner');
  //         } else if (role === 'admin') {
  //           router.push('/admin/dashboard');
  //         } else {
  //           router.push('/dashboard');
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Auth check failed:', error);
  //       // Continue to landing page on error
  //     }
  //   }
  //
  //   checkAuth();
  // }, [router]);

  return <LandingPage />;
}
