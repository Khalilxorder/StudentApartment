import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import OwnerApartmentForm from '@/components/OwnerApartmentForm';

interface EditPageProps {
  params: {
    id: string;
  };
}

export default async function EditApartmentPage({ params }: EditPageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get the apartment data
  const { data: apartment } = await supabase
    .from('apartments')
    .select('*')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .single();

  if (!apartment) {
    redirect('/owner/listings');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  href={`/owner/listings/${params.id}`} 
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                  aria-label="Back to Listing"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Edit Apartment Details</h2>
            <p className="text-gray-600">
              Update your apartment listing information. All fields marked with * are required.
            </p>
          </div>

          <OwnerApartmentForm initialData={apartment} />
        </div>
      </main>
    </div>
  );
}
