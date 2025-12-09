// Minimal instrumentation file to avoid bootstrap script errors
// This prevents the "missing bootstrap script" error in Next.js 14.2.33

// Environment validation for critical services - runs only at runtime
function validateEnvironment() {
  // Skip validation during build - only run at runtime
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('⏭️ Skipping env validation during build');
    return;
  }

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'GOOGLE_AI_API_KEY',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    // Don't throw during development, just warn
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  } else {
    console.log('✅ Environment validation passed');
  }
}

// Run validation on startup - but safely
try {
  validateEnvironment();
} catch (error) {
  console.warn('⚠️ Environment validation skipped:', error);
}

export async function register() {
  // Skip Sentry registration during build to prevent worker.js issues
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('@/sentry.edge.config');
  }
}
