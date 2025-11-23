'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { UserProfileSummary } from './UserAuthStatus';

interface UserProfileDropdownProps {
  user: User;
  profile: UserProfileSummary | null;
}

export default function UserProfileDropdown({ user, profile }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const displayName = profile?.fullName ?? user.email?.split('@')[0] ?? 'User';
  const role = profile?.role ?? 'student';
  const roleLabel = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Student';
  const roleIcon = role === 'owner' ? '🏠' : role === 'admin' ? '🛡️' : '🎓';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        alert('Account deleted successfully.');
        router.push('/');
      } else {
        alert('Failed to delete account. Please contact support.');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-gray-100">
        <Link
          href="/dashboard/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:opacity-80 transition-opacity"
          title="Go to Profile"
        >
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Avatar"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </Link>
        <button
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center space-x-3 focus:outline-none"
        >
          <div className="hidden text-left md:block">
            <div className="text-sm font-medium text-gray-900">{displayName}</div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <span>{roleIcon}</span>
              <span>{roleLabel}</span>
              {role === 'student' && profile?.university ? (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{profile.university}</span>
                </>
              ) : null}
            </div>
          </div>
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <Link href="/dashboard/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white hover:opacity-80 transition-opacity">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </Link>
                <div>
                  <div className="text-sm font-medium text-gray-900">{displayName}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                  <div className="mt-1 flex items-center space-x-1 text-xs text-gray-500">
                    <span>{roleIcon}</span>
                    <span>{roleLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="py-2">
              <MenuLink href="/dashboard" label="📊 Dashboard" onSelect={() => setIsOpen(false)} />
              <MenuLink href="/dashboard/profile" label="🧾 Profile settings" onSelect={() => setIsOpen(false)} />

              {role === 'owner' && (
                <>
                  <MenuLink href="/owner/listings" label="🏘️ My listings" onSelect={() => setIsOpen(false)} />
                  <MenuLink href="/owner/analytics" label="📈 Owner analytics" onSelect={() => setIsOpen(false)} />
                </>
              )}

              <MenuLink href="/messages" label="💬 Messages" onSelect={() => setIsOpen(false)} />
              <MenuLink href="/dashboard/favorites" label="❤️ Favorites" onSelect={() => setIsOpen(false)} />
              <MenuLink href="/dashboard/bookings" label="🗓️ My bookings" onSelect={() => setIsOpen(false)} />

              <div className="my-2 border-t border-gray-200" />

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
              >
                {isLoggingOut ? '🚪 Signing out…' : '🚪 Sign out'}
              </button>

              <button
                onClick={handleDeleteAccount}
                className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                🗑️ Delete account
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({ href, label, onSelect }: { href: string; label: string; onSelect: () => void }) {
  return (
    <a
      href={href}
      className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
      onClick={onSelect}
    >
      {label}
    </a>
  );
}
