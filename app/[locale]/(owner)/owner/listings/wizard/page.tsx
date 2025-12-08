'use client';

import { createClient } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import OwnerOnboardingWizard from '@/components/OwnerOnboardingWizard';

export default function CreateListingWizardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    }
    checkAuth();
  }, [supabase, router]);

  const handleComplete = (listingData: any) => {
    // console.log('Listing created:', listingData);
    // Redirect to the new listing or listings page
    router.push('/owner/listings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/owner/listings"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                aria-label="Back to Listings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Listing</h1>
                <p className="text-sm text-gray-500">Step-by-step wizard</p>
              </div>
            </div>
            <Link
              href="/owner/listings/create"
              className="text-sm text-orange-600 hover:text-orange-700 underline"
            >
              Use simple form instead
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OwnerOnboardingWizard onComplete={handleComplete} />
      </main>
    </div>
  );
}
