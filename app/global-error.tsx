'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Dynamic import to prevent build-time bundling issues
        import('@sentry/nextjs').then((Sentry) => {
            Sentry.captureException(error);
        }).catch(() => {
            // Sentry not available, log to console
            console.error('Global error:', error);
        });
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md w-full text-center">
                        <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                            Application Error
                        </h2>
                        <p className="text-gray-600 mb-8">
                            A critical error occurred. We&apos;ve been notified and are working to fix it.
                        </p>
                        <button
                            onClick={() => reset()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}

