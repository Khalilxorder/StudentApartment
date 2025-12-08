'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabaseClient';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Apartment } from '@/types/apartment';
import dynamic from 'next/dynamic';
import { trackEvent } from '@/components/AnalyticsProvider';
import { ArrowLeft, BookmarkPlus, GitCompare } from 'lucide-react';
import { analyzeApartmentArchetype } from '@/utils/archetype-mapper';
import ArchetypeAnalysis from '@/components/ArchetypeAnalysis';

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
    className={`absolute top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-40 text-white rounded-full hover:bg-opacity-60 transition z-10 ${direction === 'left' ? 'left-2' : 'right-2'
      }`}
  >
    {direction === 'left' ? <>&larr;</> : <>&rarr;</>}
  </button>
);

export default function ApartmentDetailsPage({ params }: { params: { id: string } }) {
  const t = useTranslations('Listing');
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [savingToCompare, setSavingToCompare] = useState(false);
  const [compareSaved, setCompareSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

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

        // Debug: Log owner_id status
        console.log('Apartment loaded:', {
          id: apartmentData.id,
          title: apartmentData.title,
          owner_id: apartmentData.owner_id || 'NOT SET',
        });

        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        setApartment(apartmentData);
        setSession(currentSession);

        // Check if this apartment is already saved for compare
        if (currentSession?.user) {
          const { data: favoriteRows, error: favoriteError } = await supabase
            .from('apartment_favorites')
            .select('id')
            .eq('apartment_id', params.id)
            .eq('user_id', currentSession.user.id)
            .limit(1);
          if (!favoriteError && favoriteRows && favoriteRows.length > 0) {
            setCompareSaved(true);
          }
        }

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

  // Determine Archetype Analysis
  const archetypeAnalysis = useMemo(() => {
    if (!apartment) return null;
    return analyzeApartmentArchetype(apartment);
  }, [apartment]);

  const handleSaveToCompare = async () => {
    if (!session?.user) {
      alert('Please sign in to save this apartment for comparison.');
      return;
    }

    try {
      setSavingToCompare(true);
      setSaveError(null);

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ apartmentId: params.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save apartment for compare');
      }

      setCompareSaved(true);
    } catch (error: any) {
      console.error('Error saving for compare:', error);
      setSaveError(error.message || 'Unable to save apartment');
    } finally {
      setSavingToCompare(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('not_found')}</h1>
          <Link href="/apartments" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow text-orange-600 hover:bg-orange-50 transition-colors" aria-label={t('back_search')}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Link
            href="/apartments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm text-purple-700 hover:bg-white transition-all font-medium"
            aria-label={t('back_search')}
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span>{t('back_search')}</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Image Gallery */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative group">
              <div className="relative w-full h-[400px] sm:h-[500px]">
                {images.length > 0 ? (
                  <>
                    <Image
                      src={images[currentImageIndex]}
                      alt={`${apartment.title} - Image ${currentImageIndex + 1}`}
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                      priority={currentImageIndex === 0}
                      sizes="(max-width: 768px) 100vw, 800px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>
                    {images.length > 1 && (
                      <>
                        <Arrow direction="left" onClick={goToPrevious} />
                        <Arrow direction="right" onClick={goToNext} />
                      </>
                    )}
                    <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">No Images Available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info Header (Mobile mainly, but useful structure) */}
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 z-0"></div>
              <div className="relative z-10">
                <div className="flex flex-col gap-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 leading-tight">{apartment.title}</h1>
                    <p className="text-gray-600 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      {apartment.address || `District ${apartment.district}, Budapest`}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-purple-700">{(apartment.price_huf || 0).toLocaleString()}</span>
                    <span className="text-gray-500 font-medium">HUF / {t('per_month')}</span>
                  </div>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{apartment.bedrooms || 0}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Beds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{apartment.bathrooms || 0}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Baths</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{apartment.size_sqm || '-'}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">m²</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{apartment.floor_number || '-'}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Floor</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Archetype Analysis - THE SOUL */}
            {archetypeAnalysis && (
              <ArchetypeAnalysis analysis={archetypeAnalysis} />
            )}

            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📝</span> {t('description_title')}
              </h2>
              <div className="prose prose-purple max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {apartment.description || 'No description available for this apartment.'}
              </div>
            </div>

            {/* Location Map */}
            {(apartment.latitude && apartment.longitude) && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>📍</span> {t('location_title')}
                  </h2>
                </div>
                <ApartmentLocationMap
                  latitude={apartment.latitude}
                  longitude={apartment.longitude}
                  address={apartment.address || `District ${apartment.district}, Budapest`}
                  title={apartment.title}
                />
              </div>
            )}

            {/* Reviews Section */}
            <div className="mt-8">
              <ReviewsDisplay apartmentId={apartment.id} />
            </div>

            {/* Review Submission Form (for logged-in users) */}
            {session && (
              <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('leave_review')}</h2>
                <ReviewSubmissionForm apartmentId={apartment.id} />
              </div>
            )}

          </div>

          {/* Sidebar / Sticky Action Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">

              {/* Action Card */}
              <div className="bg-white rounded-xl shadow-xl p-6 border border-purple-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('interested_title')}</h3>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-[1.02] shadow-md flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {t('book_now')}
                  </button>

                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 font-bold py-3 px-6 rounded-lg transition transform hover:scale-[1.02] flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t('chat_owner')}
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link
                      href={`/compare`}
                      className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg transition flex items-center justify-center text-sm"
                    >
                      <GitCompare className="w-4 h-4 mr-1" />
                      {t('compare')}
                    </Link>

                    <button
                      onClick={handleSaveToCompare}
                      disabled={savingToCompare || compareSaved}
                      className={`w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg transition flex items-center justify-center text-sm ${compareSaved ? 'text-green-600 bg-green-50' : ''}`}
                    >
                      <BookmarkPlus className="w-4 h-4 mr-1" />
                      {compareSaved ? t('saved_compare') : t('save_compare')}
                    </button>
                  </div>
                </div>

                {saveError && (
                  <p className="text-xs text-red-600 mt-2 text-center">Could not save: {saveError}</p>
                )}
              </div>

              {/* Owner Info Minimal */}
              {apartment.owner_name && (
                <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                    {apartment.owner_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">{t('listed_by')}</div>
                    <Link
                      href={`/owner/${apartment.owner_id}`}
                      className="font-bold text-gray-900 hover:text-purple-600 transition"
                    >
                      {apartment.owner_name}
                    </Link>
                    <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <span>⚡ {t('responds_fast')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Card */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <ApartmentDataVisualization
                  price={apartment.price_huf || 0}
                  sizeSqm={apartment.size_sqm || 0}
                  bedrooms={apartment.bedrooms || 0}
                  bathrooms={apartment.bathrooms || 0}
                  floorNumber={apartment.floor_number || 0}
                  district={apartment.district || 0}
                  // @ts-ignore
                  minimal={true}
                />
              </div>

              {/* Neighborhood Card */}
              {(apartment.latitude && apartment.longitude) && (
                <NeighborhoodDataCard
                  latitude={apartment.latitude}
                  longitude={apartment.longitude}
                  address={apartment.address || `District ${apartment.district}, Budapest`}
                />
              )}

            </div>
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
      {showChat && (
        apartment.owner_id ? (
          <ChatBox
            apartmentId={apartment.id}
            apartmentTitle={apartment.title || 'Apartment'}
            ownerId={apartment.owner_id}
            onClose={() => setShowChat(false)}
            currentUserEmail={session?.user?.email}
          />
        ) : (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{t('chat_unavailable')}</h3>
              <p className="text-gray-600 mb-6">{t('chat_unavailable_desc')}</p>
              <button
                onClick={() => setShowChat(false)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-lg transition"
              >
                {t('close')}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
