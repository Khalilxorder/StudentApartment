// FILE: app/admin/edit/[id]/page.tsx

import { createClient } from '@/utils/supabaseClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AdminForm from '../../AdminForm'; // We will reuse our main form
import UserProfile from '../../UserProfile';

export const dynamic = 'force-dynamic';

const HomeIcon = () => (
  <svg width="54" height="43" viewBox="0 0 54 43" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="11" y="18" width="32" height="25" rx="1" fill="#823D00"/><path d="M25.5675 1.47034C26.3525 0.664564 27.6475 0.664563 28.4325 1.47034L47.0744 20.6043C48.309 21.8716 47.4111 24 45.6418 24H8.35816C6.58888 24 5.69098 21.8716 6.92564 20.6043L25.5675 1.47034Z" fill="url(#paint0_linear_32_2)"/><path d="M23 34C23 33.4477 23.4477 33 24 33H30C30.5523 33 31 33.4477 31 34V42C31 42.5523 30.5523 43 30 43H24C23.4477 43 23 42.5523 23 42V34Z" fill="#482100"/><rect x="24" y="12" width="6" height="6" rx="1" fill="#AE5100"/><defs><linearGradient id="paint0_linear_32_2" x1="27" y1="0" x2="27" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#823D00"/><stop offset="1" stop-color="#1C0D00"/></linearGradient></defs></svg>
);

export default async function EditApartmentPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const { data: apartment } = await supabase
    .from('apartments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!apartment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-design-background p-4 sm:p-6">
      <header className="flex justify-between items-start mb-4 max-w-7xl mx-auto">
        <Link href="/admin">
          <HomeIcon />
        </Link>
        <UserProfile userEmail={session?.user.email} />
      </header>
      
      <main>
        {/* We pass the fetched apartment data into our form component */}
        <AdminForm initialData={apartment} />
      </main>
    </div>
  );
}