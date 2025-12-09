// Only initialize Sentry at runtime, not during build
// This prevents OpenTelemetry worker thread issues with Node.js 22
if (process.env.NEXT_PHASE !== 'phase-production-build') {
    import("@sentry/nextjs").then((Sentry) => {
        Sentry.init({
            dsn: "https://f5cf63dcdbc2f231251029e96ea6902e@o4510492364439552.ingest.us.sentry.io/4510492414377984",

            // Adjust sample rate based on environment
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

            // Environment identification
            environment: process.env.NODE_ENV,

            // Disable debug in production
            debug: process.env.NODE_ENV === 'development',

            // Scrub PII before sending
            beforeSend(event) {
                // Remove email addresses
                if (event.user) {
                    delete event.user.email;
                    delete event.user.ip_address;
                }

                // Remove sensitive headers
                if (event.request?.headers) {
                    delete event.request.headers.Authorization;
                    delete event.request.headers.Cookie;
                    delete event.request.headers['x-csrf-token'];
                }

                return event;
            },

            // Ignore common non-actionable errors
            ignoreErrors: [
                'Network request failed',
                /^Loading chunk \d+ failed/,
            ],
        });
    }).catch(() => {
        // Sentry not available during build
    });
}

// Empty export to make this a valid module
export { };

