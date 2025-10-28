/**
 * Advanced loading state for the home page
 * Shows while auth check is in progress
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gray-200 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gray-300 rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main loading card */}
      <div className="relative max-w-md w-full mx-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-12">
          {/* Animated loader */}
          <div className="flex justify-center mb-8">
            <div className="relative w-24 h-24">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
              
              {/* Inner icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                  <svg className="w-10 h-10 text-gray-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
              Loading Student Apartments
            </h2>
            <p className="text-gray-600">
              Preparing your personalized experience...
            </p>
          </div>

          {/* Progress steps */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-gray-700 animate-spin flex-shrink-0"></div>
              <span className="text-gray-600">Checking authentication</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
              <span className="text-gray-400">Loading preferences</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
              <span className="text-gray-400">Fetching apartments</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-8 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-gray-400 via-gray-600 to-gray-400 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Subtle hint text */}
        <p className="text-center mt-6 text-xs text-gray-400">
          This usually takes just a moment...
        </p>
      </div>
    </div>
  )
}
