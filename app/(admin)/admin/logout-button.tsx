'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut(); // Ends the user's session
    router.refresh(); // Refreshes the client-side data cache
    router.push('/login'); // Redirects the user to the login page
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
    >
      Log Out
    </button>
  );
}