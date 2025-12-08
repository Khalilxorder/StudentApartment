'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminForm from './AdminForm';
import UserProfile from './UserProfile';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import MarketingDashboard from '@/components/MarketingDashboard';

// Home icon SVG component
const HomeIcon = () => (
  <div className="p-2 bg-[#754C29] rounded-md shadow-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  </div>
);

export default function AdminPageClient({ userEmail }: { userEmail: string }) {
  const [activeTab, setActiveTab] = useState('add-apartment');

  return (
    <div className="min-h-screen bg-design-background p-4 sm:p-6">
      <header className="flex justify-between items-start mb-4 max-w-7xl mx-auto">
        <Link href="/">
          <HomeIcon />
        </Link>
        {/* Pass user email to UserProfile component */}
        <UserProfile userEmail={userEmail} />
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('add-apartment')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'add-apartment'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Add Apartment
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'analytics'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('marketing')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'marketing'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Marketing
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        <div className="space-y-8">
          {activeTab === 'add-apartment' && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Add New Apartment</h2>
              <AdminForm />
            </section>
          )}

          {activeTab === 'analytics' && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Analytics Dashboard</h2>
              <AnalyticsDashboard />
            </section>
          )}

          {activeTab === 'marketing' && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Marketing Dashboard</h2>
              <MarketingDashboard />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
