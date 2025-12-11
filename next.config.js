/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Exclude Supabase Edge Functions from build
  webpack: (config, { isServer }) => {
    // Exclude Supabase Edge Functions from Next.js build
    config.module.rules.push({
      test: /\.ts$/,
      include: /supabase\/functions/,
      loader: 'ignore-loader',
    });

    // Exclude services that use native modules (sharp, bullmq, ioredis) from build
    // These are server-only and should not be bundled at build time
    config.module.rules.push({
      test: /\.ts$/,
      include: /services\/(media-pipeline-svc|performance-optimization-svc|notify-svc)/,
      loader: 'ignore-loader',
    });

    // Exclude tests directory from Next.js build (not needed in production)
    config.module.rules.push({
      test: /\.tsx?$/,
      include: /tests\//,
      loader: 'ignore-loader',
    });

    // Exclude queue workers from Next.js build (these run as separate processes)
    config.module.rules.push({
      test: /\.ts$/,
      include: /lib\/queues/,
      loader: 'ignore-loader',
    });

    // Exclude scripts directory from Next.js build (development scripts only)
    config.module.rules.push({
      test: /\.ts$/,
      include: /scripts\//,
      loader: 'ignore-loader',
    });

    // Enable polling for network share compatibility
    config.watchOptions = {
      poll: 1000,           // Check for changes every second
      aggregateTimeout: 300, // Delay before rebuilding
      ignored: /node_modules/,
    };

    // Externalize server-only packages that use worker threads
    // This prevents Next.js from bundling them during build
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        'onnxruntime-node',
        'sharp',
        ({ request }, callback) => {
          // Externalize bullmq and ioredis to prevent worker thread issues
          if (request === 'bullmq' || request === 'ioredis') {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      );

      // During Vercel build, replace bullmq with a stub to prevent runtime errors
      if (process.env.VERCEL) {
        config.resolve = config.resolve || {};
        config.resolve.alias = config.resolve.alias || {};
        // Stub out bullmq entirely - it's not used in the main app
        config.resolve.alias['bullmq'] = false;
      }
    }

    return config;
  },


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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    // Optimize images
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Reduce bundle size with package optimization
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@headlessui/react',
      '@heroicons/react',
      'react-icons',
      'lucide-react',
    ],
    // Disabled due to Node.js 22 compatibility issues
    // webpackBuildWorker: true,
  },

  // Modularize imports to reduce bundle size
  // Note: lucide-react removed - handled by optimizePackageImports instead (Turbopack compatible)
  modularizeImports: {
    '@headlessui/react': {
      transform: '@headlessui/react/{{member}}',
    },
  },

  // Security headers
  async headers() {
    return [
      // Cache static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/api/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      // Security Headers
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
            key: 'X-XSS-Protection',
            value: '1; mode=block'
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
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.supabase.co *.stripe.com maps.googleapis.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; img-src 'self' blob: data: *.supabase.co images.unsplash.com img.icons8.com lh3.googleusercontent.com maps.googleapis.com maps.gstatic.com; font-src 'self' fonts.gstatic.com; connect-src 'self' https: wss: *.supabase.co *.stripe.com maps.googleapis.com; frame-src 'self' *.stripe.com;"
          }
        ]
      }
    ];
  },
}

const withNextIntl = require('next-intl/plugin')();

module.exports = withNextIntl(nextConfig);
