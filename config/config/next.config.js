/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'kdlxbtuovimrouwuxoyc.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
      },
    ],
  },
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable SWC minification for faster builds
  swcMinify: true,
  // Reduce bundle size with package optimization
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@supabase/auth-helpers-nextjs',
      '@headlessui/react',
      '@heroicons/react',
      'react-icons',
    ],
  },
  // Modularize imports to reduce bundle size
  modularizeImports: {
    '@supabase/auth-helpers-nextjs': {
      transform: '@supabase/auth-helpers-nextjs/dist/{{member}}',
    },
    '@headlessui/react': {
      transform: '@headlessui/react/{{member}}',
    },
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          },
          // CSRF protection
          {
            key: 'X-Requested-With',
            value: 'XMLHttpRequest'
          },
        ],
      },
      // Additional security for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-API-Key',
            value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
