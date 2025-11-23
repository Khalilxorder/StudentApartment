import { createClient } from '@/utils/supabaseClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function OwnerAnalytics() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get all apartments owned by this user
  const { data: apartments } = await supabase
    .from('apartments')
    .select('*')
    .eq('owner_id', user.id);

  // Get booking statistics
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('owner_id', user.id);

  // Calculate analytics
  const totalListings = apartments?.length || 0;
  const activeBookings = bookings?.filter(b => b.status === 'approved').length || 0;
  const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
  const totalBookings = bookings?.length || 0;

  // Revenue calculations
  const completedBookings = bookings?.filter(b => b.status === 'approved') || [];
  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Monthly revenue (current month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyBookings = completedBookings.filter(b =>
    new Date(b.created_at) >= startOfMonth
  );
  const monthlyRevenue = monthlyBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Average metrics
  const avgRevenuePerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const avgRevenuePerListing = totalListings > 0 ? totalRevenue / totalListings : 0;

  // Performance by apartment
  const apartmentStats = apartments?.map(apartment => {
    const apartmentBookings = bookings?.filter(b => b.apartment_id === apartment.id) || [];
    const apartmentRevenue = apartmentBookings
      .filter(b => b.status === 'approved')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    return {
      ...apartment,
      bookings: apartmentBookings.length,
      activeBookings: apartmentBookings.filter(b => b.status === 'approved').length,
      revenue: apartmentRevenue,
      occupancyRate: apartmentBookings.length > 0 ?
        (apartmentBookings.filter(b => b.status === 'approved').length / apartmentBookings.length) * 100 : 0
    };
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/owner" className="text-blue-600 hover:text-blue-700">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Performance</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{totalRevenue.toLocaleString()} HUF</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{monthlyRevenue.toLocaleString()} HUF</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg per Booking</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{Math.round(avgRevenuePerBooking).toLocaleString()} HUF</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalBookings > 0 ? Math.round((activeBookings / totalBookings) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Performance by Apartment */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Performance by Listing</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Listing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inquiries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apartmentStats.map((apartment) => (
                  <tr key={apartment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{apartment.title}</div>
                        <div className="text-sm text-gray-500">District {apartment.district}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {apartment.view_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {apartment.inquiry_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {apartment.activeBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {apartment.revenue.toLocaleString()} HUF
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        apartment.occupancyRate >= 75 ? 'bg-green-100 text-green-800' :
                        apartment.occupancyRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {Math.round(apartment.occupancyRate)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Booking Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Approved Bookings</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${totalBookings > 0 ? (activeBookings / totalBookings) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{activeBookings}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending Requests</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${totalBookings > 0 ? (pendingBookings / totalBookings) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{pendingBookings}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rejected/Cancelled</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${totalBookings > 0 ? ((totalBookings - activeBookings - pendingBookings) / totalBookings) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {totalBookings - activeBookings - pendingBookings}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Insights</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Portfolio Value</span>
                <span className="text-sm font-medium text-gray-900">
                  {apartmentStats.reduce((sum, apt) => sum + apt.revenue, 0).toLocaleString()} HUF
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Revenue per Listing</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(avgRevenuePerListing).toLocaleString()} HUF
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Top Performing Listing</span>
                <span className="text-sm font-medium text-gray-900">
                  {apartmentStats.length > 0 ?
                    apartmentStats.reduce((prev, current) =>
                      (prev.revenue > current.revenue) ? prev : current
                    ).title : 'N/A'
                  }
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Occupancy Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {totalListings > 0 ?
                    Math.round((activeBookings / totalListings) * 100) : 0
                  }%
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}