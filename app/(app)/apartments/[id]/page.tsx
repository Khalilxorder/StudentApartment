'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { Apartment } from '@/types/apartment';
import dynamic from 'next/dynamic';
import { trackEvent } from '@/components/AnalyticsProvider';
import { GitCompare } from 'lucide-react';

// Dynamic imports for heavy components
const ChatBox = dynamic(() => import('@/components/ChatBox'), {
  loading: () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">Loading chat...</div>,
  ssr: false,
});

const PaymentModal = dynamic(() => import('@/components/PaymentModalWrapper'), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500 mx-auto"></div>
      </div>
    </div>
  ),
  ssr: false,
});

const ApartmentLocationMap = dynamic(() => import('@/components/ApartmentLocationMap'), {
  loading: () => (
    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
      <p className="text-gray-500 text-sm">Loading map...</p>
    </div>
  ),
  ssr: false,
});

const ApartmentDataVisualization = dynamic(() => import('@/components/ApartmentDataVisualization'), {
  loading: () => (
    <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
    </div>
  ),
  ssr: false,
});

const ReviewsDisplay = dynamic(() => import('@/components/ReviewsDisplay'), {
  loading: () => (
    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
      <p className="text-gray-500 text-sm">Loading reviews...</p>
    </div>
  ),
  ssr: false,
});

const NeighborhoodDataCard = dynamic(() => import('@/components/NeighborhoodDataCard'), {
  loading: () => (
    <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
    </div>
  ),
  ssr: false,
});

const ReviewSubmissionForm = dynamic(() => import('@/components/ReviewSubmissionForm'), {
  loading: () => (
    <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
    </div>
  ),
  ssr: false,
});

// Reusable Arrow component
const Arrow = ({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`absolute top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-40 text-white rounded-full hover:bg-opacity-60 transition z-10 ${
      direction === 'left' ? 'left-2' : 'right-2'
    }`}
  >
    {direction === 'left' ? <>&larr;</> : <>&rarr;</>}
  </button>
);

export default function ApartmentDetailsPage({ params }: { params: { id: string } }) {
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch apartment
        const { data: apartmentData, error: apartmentError } = await supabase
          .from('apartments')
          .select('*')
          .eq('id', params.id)
          .single();

        if (apartmentError) {
          console.error('Apartment fetch error:', apartmentError);
          console.error('Requested ID:', params.id);
          throw apartmentError;
        }

        if (!apartmentData) {
          console.error('No apartment data returned for ID:', params.id);
          throw new Error('Apartment not found');
        }

        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        setApartment(apartmentData);
        setSession(currentSession);

        // Track page view
        trackEvent('apartment_view', {
          apartment_id: params.id,
          apartment_title: apartmentData.title,
          price: apartmentData.price_huf,
        });
      } catch (error) {
        console.error('Error fetching apartment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const images = apartment?.image_urls || [];
  const goToPrevious = () => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const goToNext = () => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Apartment Not Found</h1>
          <Link href="/apartments" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to all apartments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Link href="/apartments" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to all apartments
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Image Gallery */}
          <div className="relative w-full h-64 sm:h-96">
            {images.length > 0 ? (
              <>
                <Image
                  src={images[currentImageIndex]}
                  alt={`${apartment.title} - Image ${currentImageIndex + 1}`}
                  fill
                  className="object-cover"
                  priority={currentImageIndex === 0}
                  sizes="(max-width: 768px) 100vw, 800px"
                />
                {images.length > 1 && (
                  <>
                    <Arrow direction="left" onClick={goToPrevious} />
                    <Arrow direction="right" onClick={goToNext} />
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">No Images Available</span>
              </div>
            )}
          </div>

          {/* Apartment Details */}
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{apartment.title}</h1>
                <p className="text-gray-600">{apartment.address || `District ${apartment.district}, Budapest`}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-orange-600">{(apartment.price_huf || 0).toLocaleString()} Ft</p>
                <p className="text-gray-500 text-sm">per month</p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6 pb-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {apartment.description || 'No description available for this apartment.'}
              </p>
              
              {/* Owner Information */}
              {apartment.owner_name && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Property Owner</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {apartment.owner_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link 
                        href={`/owner/${apartment.owner_id}`}
                        className="text-lg font-semibold text-blue-600 hover:underline"
                      >
                        {apartment.owner_name}
                      </Link>
                      {apartment.owner_phone && (
                        <p className="text-gray-600">📞 {apartment.owner_phone}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        {apartment.owner_rating && (
                          <span>⭐ {apartment.owner_rating.toFixed(1)} rating</span>
                        )}
                        {apartment.owner_response_time_hours && (
                          <span>⚡ Responds within {apartment.owner_response_time_hours} hours</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Data Visualization */}
            <div className="mb-8">
              <ApartmentDataVisualization
                price={apartment.price_huf || 0}
                sizeSqm={apartment.size_sqm || 0}
                bedrooms={apartment.bedrooms || 0}
                bathrooms={apartment.bathrooms || 0}
                floorNumber={apartment.floor_number || 0}
                district={apartment.district || 0}
              />
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{apartment.bedrooms || 0}</div>
                <div className="text-sm text-gray-600">Bedrooms</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{apartment.bathrooms || 0}</div>
                <div className="text-sm text-gray-600">Bathrooms</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{apartment.size_sqm || '-'}</div>
                <div className="text-sm text-gray-600">m²</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{apartment.floor_number || '-'}</div>
                <div className="text-sm text-gray-600">Floor</div>
              </div>
            </div>

            {/* Location Map */}
            {(apartment.latitude && apartment.longitude) && (
              <div className="mb-8">
                <ApartmentLocationMap
                  latitude={apartment.latitude}
                  longitude={apartment.longitude}
                  address={apartment.address || `District ${apartment.district}, Budapest`}
                  title={apartment.title}
                />
              </div>
            )}

            {/* Neighborhood Data */}
            {(apartment.latitude && apartment.longitude) && (
              <div className="mb-8">
                <NeighborhoodDataCard
                  latitude={apartment.latitude}
                  longitude={apartment.longitude}
                  address={apartment.address || `District ${apartment.district}, Budapest`}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setShowPayment(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg hover:shadow-xl flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Book Now & Pay Deposit
              </button>

              <button
                onClick={() => setShowChat(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg hover:shadow-xl flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat with Owner
              </button>

              <Link
                href={`/compare`}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg hover:shadow-xl flex items-center justify-center"
              >
                <GitCompare className="w-5 h-5 mr-2" />
                Compare Saved Apartments
              </Link>
            </div>

            {/* Reviews Section */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
              <ReviewsDisplay apartmentId={apartment.id} />
            </div>

            {/* Review Submission Form (for logged-in users) */}
            {session && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Leave a Review</h2>
                <ReviewSubmissionForm apartmentId={apartment.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          apartment={apartment}
          onClose={() => setShowPayment(false)}
          userEmail={session?.user?.email}
        />
      )}

      {/* Chat Box */}
      {showChat && apartment.owner_id && (
        <ChatBox
          apartmentId={apartment.id}
          apartmentTitle={apartment.title || 'Apartment'}
          ownerId={apartment.owner_id}
          onClose={() => setShowChat(false)}
          currentUserEmail={session?.user?.email}
        />
      )}
    </div>
  );
}
