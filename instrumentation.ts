// Minimal instrumentation file to avoid bootstrap script errors
// This prevents the "missing bootstrap script" error in Next.js 14.2.33

// Environment validation for critical services
function validateEnvironment() {
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
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Environment validation passed');
}

// Run validation on startup
validateEnvironment();

export async function register() {
  // Intentionally empty - no instrumentation needed for basic functionality
  // Uncomment and configure when Sentry/OpenTelemetry is properly set up
  /*
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // await import('./sentry.edge.config');
  }
  */
}