// Only initialize Sentry at runtime, not during build
if (process.env.NEXT_PHASE !== 'phase-production-build') {
    import("@sentry/nextjs").then((Sentry) => {
        Sentry.init({
            dsn: process.env.SENTRY_DSN || "https://f5cf63dcdbc2f231251029e96ea6902e@o4510492364439552.ingest.us.sentry.io/4510492414377984",
            tracesSampleRate: 1.0,
            environment: process.env.NODE_ENV,
            debug: false,
        });
    }).catch(() => { });
}

// Empty export to make this a valid module
export { };
