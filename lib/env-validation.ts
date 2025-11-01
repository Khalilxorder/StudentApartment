/**
 * Environment Validation System
 * 
 * This module validates required environment variables at runtime (boot time).
 * It provides:
 * 1. Comprehensive validation of all required env vars
 * 2. Clear, helpful error messages with setup instructions
 * 3. Environment-specific requirements (dev vs prod vs CI)
 * 4. Links to documentation and configuration sources
 * 
 * Usage:
 *   // At app startup (in middleware.ts or instrumentation.ts)
 *   validateEnvironment('production');
 */

export type EnvironmentType = 'development' | 'staging' | 'production' | 'test';

export interface EnvValidationConfig {
  required: string[];
  optional?: string[];
  devOnly?: string[];
  prodOnly?: string[];
  links?: Record<string, string>;
}

/**
 * Standard environment variables for Student Apartments platform
 */
export const REQUIRED_ENV_VARS: EnvValidationConfig = {
  required: [
    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    
    // Google Services
    'GOOGLE_AI_API_KEY',
    'NEXT_PUBLIC_MAPS_API_KEY',
    
    // Search
    'MEILISEARCH_HOST',
    'MEILISEARCH_API_KEY',
    
    // Stripe
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    
    // Database
    'DATABASE_URL',
  ],
  optional: [
    'NEXT_PUBLIC_GOOGLE_MAP_ID',
    'STRIPE_WEBHOOK_SECRET',
    'REDIS_URL',
    'SENTRY_DSN',
  ],
  prodOnly: [
    'STRIPE_WEBHOOK_SECRET',
    'DATABASE_URL', // more critical in prod
  ],
  links: {
    'NEXT_PUBLIC_SUPABASE_URL': 'https://app.supabase.com/project/_/settings/api',
    'GOOGLE_AI_API_KEY': 'https://aistudio.google.com/app/apikey',
    'NEXT_PUBLIC_MAPS_API_KEY': 'https://console.cloud.google.com/apis/credentials',
    'MEILISEARCH_HOST': 'https://www.meilisearch.com/docs/learn/getting_started/installation',
    'STRIPE_SECRET_KEY': 'https://dashboard.stripe.com/apikeys',
  },
};

/**
 * Validates that all required environment variables are set
 */
export function validateEnvironment(env: EnvironmentType = 'development'): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS.required) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check environment-specific required variables
  if (env === 'production') {
    for (const varName of REQUIRED_ENV_VARS.prodOnly || []) {
      if (!process.env[varName]) {
        errors.push(`Missing production-required environment variable: ${varName}`);
      }
    }
  }

  // Check optional variables
  for (const varName of REQUIRED_ENV_VARS.optional || []) {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable not set: ${varName}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formats validation errors into a helpful message
 */
export function formatValidationError(errors: string[]): string {
  return `
╔════════════════════════════════════════════════════════════════════╗
║  ⚠️  ENVIRONMENT VALIDATION FAILED                                  ║
╚════════════════════════════════════════════════════════════════════╝

The following required environment variables are missing or invalid:

${errors.map(err => `  ❌ ${err}`).join('\n')}

SETUP INSTRUCTIONS:

1. Copy .env.example to .env.local:
   cp .env.example .env.local

2. Fill in your actual values:
   - Get Supabase credentials from: https://app.supabase.com
   - Get Google AI API key from: https://aistudio.google.com/app/apikey
   - Get Maps API key from: https://console.cloud.google.com/apis/credentials
   - Get Stripe keys from: https://dashboard.stripe.com/apikeys
   - Set up Meilisearch locally or via Docker

3. For CI/CD environments (GitHub Actions, Vercel):
   - Add environment variables as secrets in your platform
   - Do NOT commit .env.local to version control

DOCUMENTATION:
   See VERCEL_ENV_SETUP.md for detailed setup instructions
   See .env.example for all required and optional variables

`;
}

/**
 * Throws an error if environment validation fails
 * Call this at app startup to ensure all required vars are set
 */
export function validateEnvironmentOrThrow(env: EnvironmentType = 'development'): void {
  const validation = validateEnvironment(env);

  if (!validation.isValid) {
    const message = formatValidationError(validation.errors);
    console.error(message);
    
    // In production, fail hard. In development, warn but continue.
    if (env === 'production') {
      throw new Error(`Environment validation failed: ${validation.errors[0]}`);
    } else {
      console.warn('⚠️  Environment validation warnings in development mode');
      validation.warnings.forEach(w => console.warn(`  ⚠️  ${w}`));
    }
  }

  // Log successful validation in debug mode
  if (process.env.DEBUG_ENV_VALIDATION) {
    console.log('✅ Environment validation passed');
    console.log(`   Required: ${REQUIRED_ENV_VARS.required.length} variables`);
    console.log(`   Optional: ${REQUIRED_ENV_VARS.optional?.length || 0} variables`);
  }
}

/**
 * Check if specific API is configured
 */
export function isApiConfigured(apiName: string): boolean {
  const apiKeyMap: Record<string, string> = {
    'google-ai': 'GOOGLE_AI_API_KEY',
    'maps': 'NEXT_PUBLIC_MAPS_API_KEY',
    'stripe': 'STRIPE_SECRET_KEY',
    'meilisearch': 'MEILISEARCH_HOST',
    'supabase': 'NEXT_PUBLIC_SUPABASE_URL',
  };

  const envVar = apiKeyMap[apiName];
  return envVar ? !!process.env[envVar] : false;
}

/**
 * Get setup instructions for a specific API
 */
export function getSetupInstructions(apiName: string): string {
  const instructions: Record<string, string> = {
    'google-ai': `
To set up Google Generative AI:
1. Visit: https://aistudio.google.com/app/apikey
2. Create or copy your API key
3. Add to .env.local: GOOGLE_AI_API_KEY=your-key-here
    `,
    'maps': `
To set up Google Maps:
1. Visit: https://console.cloud.google.com/apis/credentials
2. Create a new API key with Maps API enabled
3. Add to .env.local: NEXT_PUBLIC_MAPS_API_KEY=your-key-here
4. (Optional) Create a Map ID at: https://console.cloud.google.com/maps/api/datasets
5. Add to .env.local: NEXT_PUBLIC_GOOGLE_MAP_ID=your-map-id
    `,
    'stripe': `
To set up Stripe:
1. Visit: https://dashboard.stripe.com/apikeys
2. Copy your Secret Key (sk_test_... or sk_live_...)
3. Add to .env.local: STRIPE_SECRET_KEY=your-secret-key
4. Copy your Publishable Key (pk_test_... or pk_live_...)
5. Add to .env.local: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-pub-key
    `,
    'meilisearch': `
To set up Meilisearch:
1. Local development: docker run -p 7700:7700 getmeili/meilisearch:latest
2. Or visit: https://www.meilisearch.com/docs/learn/getting_started/installation
3. Add to .env.local: MEILISEARCH_HOST=http://localhost:7700
4. Add API key: MEILISEARCH_API_KEY=your-master-key
    `,
    'supabase': `
To set up Supabase:
1. Visit: https://app.supabase.com
2. Create a new project or use existing
3. Go to Settings > API to get credentials
4. Add to .env.local:
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
    `,
  };

  return instructions[apiName] || `Setup instructions for ${apiName} not found`;
}

/**
 * Environment variable documentation
 */
export const ENV_VAR_DOCS = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    description: 'Supabase project URL for database and auth',
    required: true,
    public: true,
    link: 'https://app.supabase.com/project/_/settings/api',
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    description: 'Supabase anonymous key for client-side auth',
    required: true,
    public: true,
    link: 'https://app.supabase.com/project/_/settings/api',
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    description: 'Supabase service role key for server-side operations',
    required: true,
    public: false,
    link: 'https://app.supabase.com/project/_/settings/api',
  },
  'GOOGLE_AI_API_KEY': {
    description: 'Google Generative AI API key for embeddings and text generation',
    required: true,
    public: false,
    link: 'https://aistudio.google.com/app/apikey',
  },
  'NEXT_PUBLIC_MAPS_API_KEY': {
    description: 'Google Maps API key for map display and geocoding',
    required: true,
    public: true,
    link: 'https://console.cloud.google.com/apis/credentials',
  },
  'NEXT_PUBLIC_GOOGLE_MAP_ID': {
    description: 'Google Map ID for custom map styling',
    required: false,
    public: true,
    link: 'https://console.cloud.google.com/maps/api/datasets',
  },
  'MEILISEARCH_HOST': {
    description: 'Meilisearch server URL for full-text search',
    required: true,
    public: false,
    link: 'https://www.meilisearch.com',
  },
  'MEILISEARCH_API_KEY': {
    description: 'Meilisearch master API key',
    required: true,
    public: false,
    link: 'https://www.meilisearch.com',
  },
  'DATABASE_URL': {
    description: 'PostgreSQL connection string for migrations and scripts',
    required: true,
    public: false,
    link: 'https://app.supabase.com/project/_/settings/database',
  },
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': {
    description: 'Stripe publishable key for payment UI',
    required: true,
    public: true,
    link: 'https://dashboard.stripe.com/apikeys',
  },
  'STRIPE_SECRET_KEY': {
    description: 'Stripe secret key for payment processing',
    required: true,
    public: false,
    link: 'https://dashboard.stripe.com/apikeys',
  },
  'STRIPE_WEBHOOK_SECRET': {
    description: 'Stripe webhook signing secret',
    required: false,
    public: false,
    link: 'https://dashboard.stripe.com/webhooks',
  },
} as const;
