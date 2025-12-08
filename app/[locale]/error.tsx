'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to monitoring service
    console.error('Page error:', error)

    // Send to Sentry
    if (typeof window !== 'undefined') {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error);
      });
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4">
      <div className="max-w-2xl w-full">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gray-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gray-300 rounded-full opacity-10 blur-3xl"></div>
        </div>

        {/* Main error card */}
        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400"></div>

          <div className="p-12">
            {/* Icon with animated pulse */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gray-200 rounded-full animate-ping opacity-20"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Error title */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center tracking-tight">
              Something Went Wrong
            </h1>

            {/* Error description */}
            <p className="text-lg text-gray-600 mb-8 text-center leading-relaxed max-w-md mx-auto">
              We encountered an unexpected error. Our team has been automatically notified and is working on a fix.
            </p>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Development Error Details</span>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-mono text-gray-800 break-all leading-relaxed">
                    {error.message}
                  </p>
                  {error.digest && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">Error ID:</span> {error.digest}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => reset()}
                className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Try Again</span>
              </button>

              <Link
                href="/"
                className="px-8 py-3 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Go Home</span>
              </Link>
            </div>
          </div>

          {/* Footer help section */}
          <div className="px-12 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Need help?</span>
              </div>
              <a
                href="mailto:support@studentapartments.com"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 underline decoration-gray-400 hover:decoration-gray-600 transition-colors"
              >
                Contact Support →
              </a>
            </div>
          </div>
        </div>

        {/* Additional context info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Error occurred at {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  )
}
