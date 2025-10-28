'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabaseClient';
import type { User } from '@supabase/supabase-js';
import type { UserProfileSummary } from './UserAuthStatus';

interface MobileMenuProps {
  user: User | null;
  profile: UserProfileSummary | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ user, profile, isOpen, onClose }: MobileMenuProps) {
  const router = useRouter();
  const supabase = createClient();

  if (!isOpen) return null;

  const role = profile?.role ?? 'student';
  const displayName = profile?.fullName ?? user?.email?.split('@')[0] ?? 'User';
  const roleLabel = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Student';
  const roleIcon = role === 'owner' ? '🏠' : role === 'admin' ? '🛡️' : '🎓';

  const navigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />

      <div className="fixed top-0 left-0 z-50 h-full w-full bg-white md:hidden">
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          {user && (
            <div className="border-b border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-lg font-semibold text-white">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Avatar"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
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
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile navigation">
            <MenuButton label="🏠 Home" onSelect={() => navigate('/')} />
            <MenuButton label="🔍 Search apartments" onSelect={() => navigate('/search')} />

            {user ? (
              <>
                <MenuButton label="📊 Dashboard" onSelect={() => navigate('/dashboard')} />
                <MenuButton label="🧾 Profile settings" onSelect={() => navigate('/dashboard/profile')} />
                {role === 'owner' && (
                  <>
                    <MenuButton label="🏘️ My listings" onSelect={() => navigate('/owner/listings')} />
                    <MenuButton label="📝 Create listing" onSelect={() => navigate('/owner/listings/create')} />
                  </>
                )}
                <MenuButton label="💬 Messages" onSelect={() => navigate('/messages')} />
                <MenuButton label="❤️ Favorites" onSelect={() => navigate('/dashboard/favorites')} />
                <MenuButton label="🗓️ My bookings" onSelect={() => navigate('/dashboard/bookings')} />
              </>
            ) : (
              <>
                <MenuButton
                  label="🔑 Sign in"
                  onSelect={() => navigate('/login')}
                  className="text-blue-600 hover:bg-blue-50"
                />
                <MenuButton
                  label="📝 Create account"
                  onSelect={() => navigate('/signup')}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                />
              </>
            )}
          </nav>

          {user && (
            <div className="border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="w-full rounded-lg px-4 py-3 text-left text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                🚪 Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MenuButton({
  label,
  onSelect,
  className,
}: {
  label: string;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-lg px-4 py-3 text-left text-gray-700 transition-colors hover:bg-gray-100 ${className ?? ''}`}
    >
      {label}
    </button>
  );
}
