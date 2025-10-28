'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabaseClient';
import type { UserRole } from '@/utils/roles';

export default function RoleSwitcher() {
  const [currentRole, setCurrentRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadCurrentRole = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (data) {
      setCurrentRole(data.role as UserRole);
    }
    
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadCurrentRole();
  }, [loadCurrentRole]);

  async function switchTo(newRole: 'user' | 'owner') {
    if (!userId) return;
    
    setLoading(true);

    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (!error) {
      setCurrentRole(newRole);
      
      // Redirect to appropriate dashboard
      if (newRole === 'owner') {
        router.push('/owner');
      } else {
        router.push('/dashboard');
      }
      
      // Refresh the page to update middleware
      router.refresh();
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600">
        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
        Loading...
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  // Admin role cannot be switched
  if (currentRole === 'admin') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg">
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-sm font-medium text-purple-900">Admin</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-gray-600 mr-2">Mode:</div>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => switchTo('user')}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            currentRole === 'user'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            User
          </div>
        </button>
        
        <button
          onClick={() => switchTo('owner')}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            currentRole === 'owner'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Owner
          </div>
        </button>
      </div>
    </div>
  );
}
