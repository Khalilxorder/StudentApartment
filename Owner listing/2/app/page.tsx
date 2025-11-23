import Link from 'next/link';
import { createClient } from '@/utils/supabaseClient';
import ChatSearch from './components/ChatSearch';

// Your SVG logo as a reusable React component
const Logo = ({ className }: { className?: string }) => (
  <svg
    width="54"
    height="43"
    viewBox="0 0 54 43"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="11" y="18" width="32" height="25" rx="1" fill="#823D00" />
    <path
      d="M25.5675 1.47034C26.3525 0.664564 27.6475 0.664563 28.4325 1.47034L47.0744 20.6043C48.309 21.8716 47.4111 24 45.6418 24H8.35816C6.58888 24 5.69098 21.8716 6.92564 20.6043L25.5675 1.47034Z"
      fill="url(#paint0_linear_32_2)"
    />
    <path
      d="M23 34C23 33.4477 23.4477 33 24 33H30C30.5523 33 31 33.4477 31 34V42C31 42.5523 30.5523 43 30 43H24C23.4477 43 23 42.5523 23 42V34Z"
      fill="#482100"
    />
    <rect x="24" y="12" width="6" height="6" rx="1" fill="#AE5100" />
    <defs>
      <linearGradient
        id="paint0_linear_32_2"
        x1="27"
        y1="0"
        x2="27"
        y2="32"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#823D00" />
        <stop offset="1" stopColor="#1C0D00" />
      </linearGradient>
    </defs>
  </svg>
);

export default async function HomePage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Slim top navigation bar */}
      <header className="bg-white shadow-sm border-b px-6 py-3 flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Logo className="h-10 w-auto" />
          <div>
            <h1 className="text-gray-900 font-bold text-lg">Student Apartments</h1>
            <p className="text-gray-600 text-xs">AI-Powered Search</p>
          </div>
        </Link>
        <div className="flex gap-3 items-center">
          {session ? (
            <>
              <Link
                href="/apartments"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Browse
              </Link>
              <Link
                href="/admin"
                className="text-sm font-medium px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Admin
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Navigation widgets */}
      <div className="bg-gray-50 border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link
              href="/apartments"
              className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Browse Apartments</span>
            </Link>

            <Link
              href="/design-apartment"
              className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Design Apartment</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">My Dashboard</span>
            </Link>

            <Link
              href="/compare"
              className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Compare</span>
            </Link>

            <Link
              href="/apartments?saved=true"
              className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Saved</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Full-screen chat search component */}
      <div className="flex-1 overflow-hidden">
        <ChatSearch />
      </div>
    </div>
  );
}
