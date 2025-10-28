'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { Apartment } from '@/types/apartment';

export default function OwnerProfilePage({ params }: { params: { id: string } }) {
  const [owner, setOwner] = useState<any>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    averageRating: 0,
    responseTime: 0
  });

  useEffect(() => {
    const fetchOwnerData = async () => {
      try {
        // First, get owner info from users table or profile
        // Since we might not have a separate owners table, let's get from apartments
        const { data: ownerApartments, error } = await supabase
          .from('apartments')
          .select('*')
          .eq('owner_id', params.id)
          .eq('is_available', true);

        if (error) throw error;

        if (ownerApartments && ownerApartments.length > 0) {
          // Extract owner info from the first apartment (assuming consistent across listings)
          const firstApt = ownerApartments[0];
          setOwner({
            id: firstApt.owner_id,
            name: firstApt.owner_name || 'Property Owner',
            phone: firstApt.owner_phone,
            response_time_hours: firstApt.owner_response_time_hours,
            rating: firstApt.owner_rating
          });

          setApartments(ownerApartments);

          // Calculate stats
          const activeListings = (ownerApartments as Apartment[]).filter(apt => apt.is_available).length;
          setStats({
            totalListings: ownerApartments.length,
            activeListings,
            averageRating: firstApt.owner_rating || 0,
            responseTime: firstApt.owner_response_time_hours || 0
          });
        }
      } catch (error) {
        console.error('Error fetching owner data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Owner Not Found</h1>
          <Link href="/apartments" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to apartments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/apartments" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to apartments
          </Link>
        </div>

        {/* Owner Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {owner.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{owner.name}</h1>
              <div className="flex items-center gap-4 text-gray-600">
                <span>📞 {owner.phone || 'Contact for phone number'}</span>
                {owner.rating && (
                  <span>⭐ {owner.rating.toFixed(1)} rating</span>
                )}
                {stats.responseTime && (
                  <span>⚡ Responds within {stats.responseTime} hours</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{stats.activeListings}</div>
              <div className="text-sm text-gray-600">Active Listings</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalListings}</div>
            <div className="text-gray-600">Total Listings</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.activeListings}</div>
            <div className="text-gray-600">Active Listings</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.averageRating.toFixed(1)}</div>
            <div className="text-gray-600">Average Rating</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stats.responseTime}h</div>
            <div className="text-gray-600">Response Time</div>
          </div>
        </div>

        {/* Property Portfolio */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Portfolio ({apartments.length})</h2>

          {apartments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🏠</div>
              <p>No active listings at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apartments.map((apartment) => (
                <div key={apartment.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer" onClick={() => window.location.href = `/apartments/${apartment.id}`}>
                  <div className="relative h-48 bg-gray-200">
                    {apartment.image_urls && apartment.image_urls[0] ? (
                      <Image
                        src={apartment.image_urls[0]}
                        alt={apartment.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">🏠</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 hover:text-orange-600 transition-colors">{apartment.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">
                      📍 District {apartment.district} • 🛏️ {apartment.bedrooms} beds
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-orange-600">
                        {apartment.price_huf?.toLocaleString()} Ft
                      </span>
                      <div className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition">
                        View Details →
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}