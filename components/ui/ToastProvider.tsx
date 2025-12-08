'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, 'id'>) => void;
    showError: (title: string, message: string) => void;
    showSuccess: (title: string, message: string) => void;
    showWarning: (title: string, message: string) => void;
    showInfo: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

// Human-readable error messages
const ERROR_MESSAGES: Record<string, string> = {
    'Invalid CSRF token': 'Your session has expired. Please refresh the page and try again.',
    'Network Error': 'Unable to connect to the server. Please check your internet connection.',
    'Unauthorized': 'You need to sign in to perform this action.',
    '403': 'You do not have permission to perform this action.',
    '404': 'The requested resource was not found.',
    '500': 'Something went wrong on our end. Please try again later.',
    'SUPABASE_SERVICE_ROLE_KEY': 'Server configuration issue. Please contact support.',
    'Maps API': 'Maps could not be loaded. Please try again later.',
    'default': 'Something went wrong. Please try again.',
};

export function getHumanReadableError(error: string | Error): string {
    const errorString = error instanceof Error ? error.message : error;

    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
        if (errorString.includes(key)) {
            return message;
        }
    }

    return ERROR_MESSAGES.default;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration
        setTimeout(() => {
            removeToast(id);
        }, toast.duration || 5000);
    }, [removeToast]);

    const showError = useCallback((title: string, message: string) => {
        showToast({ type: 'error', title, message: getHumanReadableError(message), duration: 7000 });
    }, [showToast]);

    const showSuccess = useCallback((title: string, message: string) => {
        showToast({ type: 'success', title, message, duration: 4000 });
    }, [showToast]);

    const showWarning = useCallback((title: string, message: string) => {
        showToast({ type: 'warning', title, message, duration: 5000 });
    }, [showToast]);

    const showInfo = useCallback((title: string, message: string) => {
        showToast({ type: 'info', title, message, duration: 4000 });
    }, [showToast]);

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'info': return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success': return 'bg-green-50 border-green-200';
            case 'error': return 'bg-red-50 border-red-200';
            case 'warning': return 'bg-yellow-50 border-yellow-200';
            case 'info': return 'bg-blue-50 border-blue-200';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showError, showSuccess, showWarning, showInfo }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right ${getStyles(toast.type)}`}
                        role="alert"
                    >
                        {getIcon(toast.type)}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{toast.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
