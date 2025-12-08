'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MapPin } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
    fallbackMessage?: string;
    showRetry?: boolean;
    onRetry?: () => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Error boundary for third-party components like Maps and Reviews
 * Gracefully handles failures and provides retry option
 */
export class ThirdPartyErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ThirdPartyErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
        this.props.onRetry?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {this.props.fallbackTitle || 'Unable to load'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {this.props.fallbackMessage || 'This content is temporarily unavailable. Please try again.'}
                    </p>
                    {(this.props.showRetry !== false) && (
                        <button
                            onClick={this.handleRetry}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </button>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Specific error boundary for Google Maps
 */
export function MapErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ThirdPartyErrorBoundary
            fallbackTitle="Map unavailable"
            fallbackMessage="We couldn't load the map. This may be due to your connection or ad blockers."
        >
            {children}
        </ThirdPartyErrorBoundary>
    );
}

/**
 * Map placeholder when no coordinates available
 */
export function MapPlaceholder({ message }: { message?: string }) {
    return (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
                {message || 'Location not available'}
            </p>
        </div>
    );
}

/**
 * Specific error boundary for Reviews
 */
export function ReviewsErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ThirdPartyErrorBoundary
            fallbackTitle="Reviews unavailable"
            fallbackMessage="We couldn't load reviews at this time. They may appear after a page refresh."
        >
            {children}
        </ThirdPartyErrorBoundary>
    );
}

/**
 * Reviews placeholder when none exist
 */
export function ReviewsPlaceholder() {
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">No reviews yet</p>
            <p className="text-sm text-gray-500 mt-1">Be the first to review this listing!</p>
        </div>
    );
}
