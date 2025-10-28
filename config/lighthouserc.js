module.exports = {
  ci: {
    collect: {
      // Collect Lighthouse reports for these pages
      url: [
        'http://localhost:3000',
        'http://localhost:3000/search',
        'http://localhost:3000/listings',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/onboarding',
      ],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready - started server on',
      numberOfRuns: 3,
    },
    assert: {
      // Budget thresholds for Lighthouse scores
      assertions: {
        'categories.performance.score': ['error', { minScore: 0.9 }],
        'categories.accessibility.score': ['error', { minScore: 0.9 }],
        'categories.best-practices.score': ['error', { minScore: 0.9 }],
        'categories.seo.score': ['error', { minScore: 0.9 }],
        'categories.pwa.score': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
  // Desktop configuration
  desktop: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
    },
  },
  // Mobile configuration
  mobile: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 360,
        height: 640,
        deviceScaleFactor: 2.625,
        disabled: false,
      },
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
      },
    },
  },
};