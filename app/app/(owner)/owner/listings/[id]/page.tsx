import { createClient } from '@/utils/supabaseClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface ListingDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
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

  // Get booking stats for this apartment
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('apartment_id', params.id);

  const activeBookings = bookings?.filter((b: any) => b.status === 'approved').length || 0;
  const pendingBookings = bookings?.filter((b: any) => b.status === 'pending').length || 0;
  const totalBookings = bookings?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/owner/listings" className="text-blue-600 hover:text-blue-700">
                ← Back to Listings
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{apartment.title}</h1>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/owner/listings/${params.id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Edit Listing
              </Link>
              <Link
                href={`/apartments/${params.id}`}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                View Public Page
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            {apartment.image_urls && apartment.image_urls.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {apartment.image_urls.slice(0, 4).map((url: string, index: number) => (
                    <div key={index} className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
                      <Image
                        src={url}
                        alt={`${apartment.title} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">District</span>
                  <p className="font-medium">District {apartment.district}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Monthly Rent</span>
                  <p className="font-medium text-green-600">{apartment.price_huf?.toLocaleString()} HUF</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Bedrooms</span>
                  <p className="font-medium">{apartment.bedrooms || 0}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Bathrooms</span>
                  <p className="font-medium">{apartment.bathrooms || 0}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{apartment.description}</p>
            </div>

            {/* Features */}
            {apartment.features && apartment.features.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Features & Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {apartment.features.map((feature: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Views</span>
                  <span className="font-medium">{apartment.view_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inquiries</span>
                  <span className="font-medium">{apartment.inquiry_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Bookings</span>
                  <span className="font-medium">{totalBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Bookings</span>
                  <span className="font-medium text-green-600">{activeBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Requests</span>
                  <span className="font-medium text-yellow-600">{pendingBookings}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Availability</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apartment.is_available
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {apartment.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Featured</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apartment.featured
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {apartment.featured ? 'Featured' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/owner/listings/${params.id}/edit`}
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Edit Listing
                </Link>
                <Link
                  href={`/apartments/${params.id}`}
                  className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  View Public Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}