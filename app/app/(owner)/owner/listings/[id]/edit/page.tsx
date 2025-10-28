import { createClient } from '@/utils/supabaseClient';
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
              <Link href={`/owner/listings/${params.id}`} className="text-blue-600 hover:text-blue-700">
                ← Back to Listing
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