module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready',
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/apartments',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};