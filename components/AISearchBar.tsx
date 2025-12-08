'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, SlidersHorizontal, X, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface AISearchBarProps {
    onSearch?: (query: string, isAI: boolean) => void;
    onFeedback?: (helpful: boolean, query: string, sessionId: string) => void;
    placeholder?: string;
    sticky?: boolean;
}

/**
 * Sticky AI Search Bar for Browse page
 * Toggle between "Filters" and "AI" modes
 * Includes feedback mechanism for telemetry
 */
export function AISearchBar({
    onSearch,
    onFeedback,
    placeholder = "Tell us what you need: 'quiet near ELTE', '2 bed with balcony', 'under 150k'",
    sticky = true,
}: AISearchBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<'ai' | 'filters'>('ai');
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [lastQuery, setLastQuery] = useState('');
    const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize from URL params
    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setQuery(q);
            setLastQuery(q);
        }
    }, [searchParams]);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setLastQuery(query);

        try {
            if (mode === 'ai') {
                // AI search endpoint
                const response = await fetch('/api/ai/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, sessionId }),
                });

                if (response.ok) {
                    const data = await response.json();
                    // Update URL with search params
                    router.push(`/apartments?q=${encodeURIComponent(query)}&ai=true`);
                    onSearch?.(query, true);
                    setShowFeedback(true);
                }
            } else {
                // Regular filter search
                router.push(`/apartments?q=${encodeURIComponent(query)}`);
                onSearch?.(query, false);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleFeedback = async (helpful: boolean) => {
        try {
            await fetch('/api/search/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: lastQuery,
                    helpful,
                    sessionId,
                    timestamp: new Date().toISOString(),
                }),
            });
            onFeedback?.(helpful, lastQuery, sessionId);
        } catch (error) {
            console.error('Feedback error:', error);
        }
        setShowFeedback(false);
    };

    const clearSearch = () => {
        setQuery('');
        setShowFeedback(false);
        inputRef.current?.focus();
    };

    return (
        <div
            className={`bg-white border-b border-gray-200 ${sticky ? 'sticky top-0 z-40 shadow-sm' : ''
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Mode Toggle */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <button
                        onClick={() => setMode('ai')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${mode === 'ai'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Sparkles className="h-4 w-4" />
                        AI Search
                    </button>
                    <button
                        onClick={() => setMode('filters')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${mode === 'filters'
                            ? 'bg-gray-900 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                    </button>
                </div>

                {/* Search Input */}
                <form onSubmit={handleSearch} className="relative">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            {mode === 'ai' ? (
                                <Sparkles className="h-5 w-5 text-purple-500" />
                            ) : (
                                <Search className="h-5 w-5 text-gray-400" />
                            )}
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={mode === 'ai' ? placeholder : 'Search by location, price, features...'}
                            className={`w-full pl-12 pr-24 py-4 text-lg border-2 rounded-xl focus:outline-none transition-all ${mode === 'ai'
                                ? 'border-purple-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
                                : 'border-gray-200 focus:border-gray-400 focus:ring-4 focus:ring-gray-100'
                                }`}
                            disabled={isSearching}
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute inset-y-0 right-20 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isSearching || !query.trim()}
                            className={`absolute inset-y-0 right-2 my-2 px-4 rounded-lg font-semibold transition-all disabled:opacity-50 ${mode === 'ai'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                                : 'bg-gray-900 text-white hover:bg-gray-800'
                                }`}
                        >
                            {isSearching ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                'Search'
                            )}
                        </button>
                    </div>
                </form>

                {/* AI Examples */}
                {mode === 'ai' && !query && (
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        {[
                            'quiet near ELTE',
                            '2 bed with balcony',
                            'under 150k HUF',
                            'pet-friendly near metro',
                        ].map((example) => (
                            <button
                                key={example}
                                onClick={() => setQuery(example)}
                                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100 transition"
                            >
                                {`"${example}"`}
                            </button>
                        ))}
                    </div>
                )}

                {/* Feedback prompt */}
                {showFeedback && (
                    <div className="mt-4 flex items-center justify-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Was this helpful?</span>
                        <button
                            onClick={() => handleFeedback(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition"
                        >
                            <ThumbsUp className="h-4 w-4" />
                            Helped
                        </button>
                        <button
                            onClick={() => handleFeedback(false)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200 transition"
                        >
                            <ThumbsDown className="h-4 w-4" />
                            Didn&apos;t help
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
