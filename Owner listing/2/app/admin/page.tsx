import { createClient } from '@/utils/supabaseClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';
// Import AdminForm, as add-apartment-form.tsx exports AdminForm
import AdminForm from './AdminForm';
import UserProfile from './UserProfile';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';

export const dynamic = 'force-dynamic'; // Ensures this page is dynamically rendered on each request

// Home icon SVG component
const HomeIcon = () => (
  <div className="p-2 bg-[#754C29] rounded-md shadow-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  </div>
);

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
    <div className="min-h-screen bg-design-background p-4 sm:p-6">
      <header className="flex justify-between items-start mb-4 max-w-7xl mx-auto">
        <Link href="/">
          <HomeIcon />
        </Link>
        {/* Pass user email to UserProfile component */}
        <UserProfile userEmail={session.user.email} />
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-4 border-b border-gray-200">
            <button className="px-4 py-2 text-sm font-medium text-orange-600 border-b-2 border-orange-600">
              Add Apartment
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Analytics
            </button>
          </nav>
        </div>

        {/* Content based on active tab - for now showing both */}
        <div className="space-y-8">
          {/* Add Apartment Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Add New Apartment</h2>
            <AdminForm />
          </section>

          {/* Analytics Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Analytics Dashboard</h2>
            <AnalyticsDashboard />
          </section>
        </div>
      </main>
    </div>
  );
}