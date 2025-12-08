'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Phone, Calendar, Star, Shield, MapPin } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/utils/supabaseClient';

interface ProfileSidebarProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  role: string | null;
  university: string | null;
  created_at: string;
  verified: boolean;
  rating?: number;
  listing_count?: number;
}

export default function ProfileSidebar({ userId, isOpen, onClose }: ProfileSidebarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadProfile = async () => {
      setLoading(true);
      const supabase = createClient();

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;

        // Get listing count if owner
        let listingCount = 0;
        if (profileData?.role === 'owner') {
          const { count } = await supabase
            .from('apartments')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', userId);
          listingCount = count || 0;
        }

        // Get average rating if owner
        let rating = undefined;
        if (profileData?.role === 'owner') {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('owner_id', userId);
          
          if (reviews && reviews.length > 0) {
            rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          }
        }

        setProfile({
          ...profileData,
          listing_count: listingCount,
          rating,
        });
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className={`
        fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close profile"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-gray-200" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
              <div className="space-y-2 mt-6">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Avatar & Name */}
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-3">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User'}
                      fill
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-3xl font-bold">
                      {(profile.full_name || profile.email)[0].toUpperCase()}
                    </div>
                  )}
                  {profile.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full">
                      <Shield className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {profile.full_name || 'Anonymous User'}
                </h3>
                <p className="text-sm text-gray-500 capitalize">
                  {profile.role || 'Student'}
                </p>
              </div>

              {/* Stats for Owners */}
              {profile.role === 'owner' && (
                <div className="flex justify-center gap-6 py-3 border-y border-gray-100">
                  {profile.rating && (
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{profile.rating.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Rating</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-semibold">{profile.listing_count || 0}</p>
                    <p className="text-xs text-gray-500">Listings</p>
                  </div>
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">About</h4>
                  <p className="text-sm text-gray-600">{profile.bio}</p>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Contact</h4>
                
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 truncate">{profile.email}</span>
                </div>

                {profile.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{profile.phone}</span>
                  </div>
                )}

                {profile.university && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{profile.university}</span>
                  </div>
                )}
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-3 text-sm text-gray-500 pt-4 border-t border-gray-100">
                <Calendar className="h-4 w-4" />
                <span>
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Verification Badge */}
              {profile.verified && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Verified User</p>
                    <p className="text-xs text-green-600">Identity confirmed</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Could not load profile</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
