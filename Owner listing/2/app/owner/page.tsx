import { createClient } from '@/utils/supabaseClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import UserProfile from '../admin/UserProfile';
import RoleSwitcher from '../components/RoleSwitcher';

export default async function OwnerDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get owner stats
  const { data: apartments, count: totalListings } = await supabase
    .from('apartments')
    .select('*', { count: 'exact' })
    .eq('owner_id', user.id);

  const { data: bookings, count: activeBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact' })
    .eq('owner_id', user.id)
    .eq('status', 'approved');

  const { data: pendingBookings, count: pendingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact' })
    .eq('owner_id', user.id)
    .eq('status', 'pending');

  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('id, apartment_id')
    .in('apartment_id', (apartments || []).map(a => a.id))
    .eq('read', false)
    .neq('sender_email', user.email);

  // Calculate total revenue this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyPayments } = await supabase
    .from('payment_transactions')
    .select('amount, bookings!inner(owner_id)')
    .eq('bookings.owner_id', user.id)
    .eq('status', 'succeeded')
    .gte('created_at', startOfMonth.toISOString());

  const monthlyRevenue = (monthlyPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  // Get recent bookings
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      apartments (title, district),
      user_profiles (full_name)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                StudentApartments
              </Link>
              <span className="text-sm text-gray-500">Owner Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <RoleSwitcher />
              <UserProfile userEmail={user.email} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Listings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalListings || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>
            <Link href="/owner/listings" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              Manage listings →
            </Link>
          </div>

          {/* Active Bookings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{activeBookings || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link href="/owner/bookings" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              View bookings →
            </Link>
          </div>

          {/* Pending Requests */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{pendingCount || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            {pendingCount! > 0 && (
              <Link href="/owner/bookings?status=pending" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                Review requests →
              </Link>
            )}
          </div>

          {/* Unread Messages */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{unreadMessages?.length || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
            <Link href="/owner/messages" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              View messages →
            </Link>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Revenue This Month</p>
              <p className="text-4xl font-bold mt-2">{monthlyRevenue.toLocaleString()} HUF</p>
              <p className="text-sm opacity-75 mt-1">From {monthlyPayments?.length || 0} payment(s)</p>
            </div>
            <div className="p-4 bg-white bg-opacity-20 rounded-full">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <Link href="/owner/payments" className="mt-4 inline-block bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition">
            View Payment History
          </Link>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Booking Requests</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentBookings && recentBookings.length > 0 ? (
              recentBookings.map((booking: any) => (
                <div key={booking.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {booking.apartments?.title || 'Unknown Apartment'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Tenant: {booking.user_profiles?.full_name || 'Unknown'} • 
                        Move-in: {new Date(booking.move_in_date).toLocaleDateString()} • 
                        {booking.lease_months} months
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                        booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {booking.total_amount?.toLocaleString()} HUF
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No booking requests yet
              </div>
            )}
          </div>
          {recentBookings && recentBookings.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <Link href="/owner/bookings" className="text-sm text-blue-600 hover:underline font-medium">
                View all bookings →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/owner/listings/create" className="flex items-center gap-4 p-6 bg-white rounded-lg shadow hover:shadow-md transition">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Add New Listing</h3>
              <p className="text-sm text-gray-500">Create apartment listing</p>
            </div>
          </Link>

          <Link href="/owner/analytics" className="flex items-center gap-4 p-6 bg-white rounded-lg shadow hover:shadow-md transition">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">View Analytics</h3>
              <p className="text-sm text-gray-500">Performance insights</p>
            </div>
          </Link>

          <Link href="/owner/messages" className="flex items-center gap-4 p-6 bg-white rounded-lg shadow hover:shadow-md transition">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Chat with Tenants</h3>
              <p className="text-sm text-gray-500">Respond to inquiries</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
