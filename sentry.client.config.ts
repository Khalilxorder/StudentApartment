// Only initialize Sentry at runtime, not during build
if (typeof window !== 'undefined') {
    import('@sentry/nextjs').then((Sentry) => {
        Sentry.init({
            dsn: "https://f5cf63dcdbc2f231251029e96ea6902e@o4510492364439552.ingest.us.sentry.io/4510492414377984",

            // Environment
            environment: process.env.NODE_ENV,

            // Sample rate for performance monitoring (10% in production)
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

            // Session replay
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,

            // Scrub PII before sending
            beforeSend(event) {
                // Remove email addresses
                if (event.user) {
                    delete event.user.email;
                    delete event.user.ip_address;
                }

                // Remove sensitive request data
                if (event.request?.headers) {
                    delete event.request.headers.Authorization;
                    delete event.request.headers.Cookie;
                    delete event.request.headers['x-csrf-token'];
                }

                return event;
            },

            // Ignore certain errors
            ignoreErrors: [
                'ResizeObserver loop limit exceeded',
                'Network request failed',
                /^Loading chunk \d+ failed/,
            ],
        });
    }).catch(() => { });
}

// Empty export to make this a valid module
export { };

