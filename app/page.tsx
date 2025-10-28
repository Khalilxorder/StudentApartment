import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/LandingPage'
import { authObservability, trackRedirect } from '@/lib/auth-observability'

// Force dynamic rendering for auth checks
export const dynamic = 'force-dynamic'
export const revalidate = 0

// SEO metadata for anonymous users
export async function generateMetadata() {
  return {
    title: 'Student Apartments Budapest - Find Your Perfect Student Housing',
    description: 'AI-powered search for student apartments in Budapest. Find verified listings near universities with transparent pricing and secure messaging.',
    openGraph: {
      title: 'Student Apartments Budapest',
      description: 'Find your perfect student apartment with AI-powered search',
      type: 'website',
    },
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  // Environment validation
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase environment variables')
    authObservability.track('env_missing')
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Error</h1>
          <p className="text-gray-600 mb-4">
            Supabase environment variables are not configured. Please check your .env.local file.
          </p>
          <pre className="text-xs bg-gray-100 p-3 rounded text-left overflow-x-auto">
            NEXT_PUBLIC_SUPABASE_URL=your_url_here{'\n'}
            NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
          </pre>
        </div>
      </div>
    )
  }

  try {
    authObservability.track('auth_check_start')
    
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    // Handle auth errors gracefully
    if (error) {
      console.warn('⚠️ Auth check failed:', error.message)
      authObservability.track('auth_check_error', { error: error.message })
      // Continue to landing page - treat as unauthenticated
      return <LandingPage />
    }

    authObservability.track('auth_check_success', { userId: user?.id })

    // If user is authenticated, redirect with smart routing
    if (user) {
      // Support redirect parameter for post-login flow
      const redirectTo = searchParams?.redirect || '/dashboard'
      
      // Validate redirect is internal (security: prevent open redirect)
      const isInternalRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//')
      const safeRedirect = isInternalRedirect ? redirectTo : '/dashboard'

      // Track redirect for observability
      trackRedirect(user.id, safeRedirect)

      // TODO: Role-based routing (when roles are implemented)
      // const { data: profile } = await supabase
      //   .from('user_profiles')
      //   .select('role')
      //   .eq('id', user.id)
      //   .single()
      // 
      // if (profile?.role === 'owner') redirect('/owner/dashboard')
      // if (profile?.role === 'admin') redirect('/admin/dashboard')

      redirect(safeRedirect)
    }

    // Anonymous user - show landing page
    return <LandingPage />

  } catch (error) {
    // Catch-all for unexpected errors (network, parsing, etc.)
    console.error('❌ Critical error in home page:', error)
    
    // Log to monitoring (if available)
    if (typeof window === 'undefined' && process.env.SENTRY_DSN) {
      // Server-side: would send to Sentry/monitoring
      // captureException(error)
    }

    // Graceful fallback - show landing page with error context
    return (
      <div className="min-h-screen flex flex-col">
        {/* Error banner */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="text-yellow-600">⚠️</span>
            <p className="text-sm text-yellow-800">
              We&apos;re experiencing technical difficulties. You can still browse apartments, but some features may be limited.
            </p>
          </div>
        </div>
        <div className="flex-1">
          <LandingPage />
        </div>
      </div>
    )
  }
}
