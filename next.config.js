/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Skip problematic pages during static export
  // These are dynamic pages that should only be rendered at runtime
  skipTrailingSlashRedirect: true,
  
  // Exclude specific pages from static export
  exportPathMap: async function (
    defaultPathMap,
    { dev, dir, outDir, distDir, buildId }
  ) {
    // Remove problematic dynamic pages from export
    const pathMap = { ...defaultPathMap };
    delete pathMap['/dashboard/messages'];
    delete pathMap['/dashboard/profile'];
    delete pathMap['/owner/messages'];
    delete pathMap['/owner/profile'];
    return pathMap;
  },

  // Exclude Supabase Edge Functions from build
  webpack: (config, { isServer }) => {
    // Exclude Supabase Edge Functions from Next.js build
    config.module.rules.push({
      test: /\.ts$/,
      include: /supabase\/functions/,
      loader: 'ignore-loader',
    });

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

  // Enable SWC minification for faster builds
  swcMinify: true,

  // Reduce bundle size with package optimization
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@headlessui/react',
      '@heroicons/react',
      'react-icons',
      'lucide-react',
    ],
    // Enable webpack build optimizations
    webpackBuildWorker: true,
  },

  // Modularize imports to reduce bundle size
  modularizeImports: {
    '@headlessui/react': {
      transform: '@headlessui/react/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/{{member}}',
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
    ];
  },
}

module.exports = nextConfig
