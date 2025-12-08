import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function BookingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, apartments(title, district, image_urls, address)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
            <p className="text-gray-600 mt-2">
              Track your booking requests and lease agreements
            </p>
          </div>

        </div>

        {/* Bookings List */}
        {bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking: any) => {
              const apt = booking.apartments;
              const statusColors = {
                pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                approved: 'bg-green-100 text-green-800 border-green-200',
                rejected: 'bg-red-100 text-red-800 border-red-200',
                cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
              };

              const paymentColors = {
                unpaid: 'bg-gray-100 text-gray-700',
                pending: 'bg-yellow-100 text-yellow-700',
                paid: 'bg-green-100 text-green-700',
                failed: 'bg-red-100 text-red-700',
              };

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Apartment Image & Info */}
                      <div className="flex gap-4 flex-1">
                        {apt?.image_urls?.[0] && (
                          <Link href={`/apartments/${booking.apartment_id}`} className="relative w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={apt.image_urls[0]}
                              alt={apt.title || 'Apartment'}
                              fill
                              className="object-cover hover:scale-105 transition"
                              sizes="128px"
                            />
                          </Link>
                        )}

                        <div className="flex-1 min-w-0">
                          <Link href={`/apartments/${booking.apartment_id}`}>
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-yellow-600 transition">
                              {apt?.title || 'Untitled Apartment'}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-600 mt-1">
                            📍 {apt?.address || `District ${apt?.district}, Budapest`}
                          </p>

                          {/* Booking Details */}
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Move-in:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {new Date(booking.move_in_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Lease:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {booking.lease_months} months
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Applied:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {new Date(booking.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status & Payment Info */}
                      <div className="lg:w-64 space-y-4">
                        {/* Status Badges */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Status:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[booking.status as keyof typeof statusColors] || statusColors.pending}`}>
                              {booking.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Payment:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentColors[booking.payment_status as keyof typeof paymentColors] || paymentColors.unpaid}`}>
                              {booking.payment_status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="border-t border-gray-200 pt-4">
                          <div className="text-sm text-gray-500 mb-1">Total Amount:</div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {booking.total_amount?.toLocaleString() || 'N/A'} HUF
                          </div>
                          {booking.deposit_amount && (
                            <div className="text-xs text-gray-500 mt-1">
                              Including {booking.deposit_amount.toLocaleString()} HUF deposit
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          {booking.status === 'pending' && booking.payment_status === 'unpaid' && (
                            <Link
                              href={`/dashboard/bookings/${booking.id}/pay`}
                              className="block w-full text-center px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition"
                            >
                              Complete Payment
                            </Link>
                          )}

                          {booking.status === 'approved' && booking.payment_status === 'paid' && (
                            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">Booking Confirmed!</span>
                            </div>
                          )}

                          <Link
                            href={`/dashboard/messages?booking=${booking.id}`}
                            className="block w-full text-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                          >
                            💬 Message Owner
                          </Link>

                          {booking.status === 'pending' && (
                            <button
                              className="w-full text-center px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition text-sm"
                            >
                              Cancel Application
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment Receipt Link */}
                    {booking.payment_intent_id && booking.payment_status === 'paid' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Link
                          href={`/dashboard/bookings/${booking.id}/receipt`}
                          className="text-sm text-yellow-600 hover:text-yellow-700 font-medium inline-flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Receipt
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Empty State
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No applications yet</h2>
              <p className="text-gray-600 mb-6">
                When you apply for an apartment, you&apos;ll see the details here
              </p>
              <Link
                href="/apartments"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Browse Apartments
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
