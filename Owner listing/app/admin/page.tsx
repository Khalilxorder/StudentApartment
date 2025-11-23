import { createClient } from '@/utils/supabaseClient';
import { redirect } from 'next/navigation';
import AdminPageClient from './AdminPageClient';

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession(); // Get current user session

  // Redirect to login if no active session is found
  if (!session) {
    redirect('/login');
  }

  return (
    <AdminPageClient userEmail={session.user.email || ''} />
  );
}