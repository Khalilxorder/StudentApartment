'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StickyAISearchBarProps {
  onSearch?: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
}

export default function StickyAISearchBar({
  onSearch,
  initialQuery = '',
  placeholder = 'Describe your ideal apartment... "Quiet 2BR near BME under 250k HUF"'
}: StickyAISearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Intersection Observer for sticky behavior
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 200) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (onSearch) {
      onSearch(query);
    } else {
      // Navigate to search page with AI query
      router.push(`/search?q=${encodeURIComponent(query)}&mode=ai`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  return (
    <>
      {/* Sentinel element to detect when to become sticky */}
      <div ref={sentinelRef} className="h-0" aria-hidden="true" />

      {/* Sticky AI Search Bar */}
      <div
        ref={barRef}
        className={`
          transition-all duration-300 ease-in-out z-40
          ${isSticky 
            ? `fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100
               ${isVisible ? 'translate-y-0' : '-translate-y-full'}`
            : 'relative bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl'
          }
        `}
      >
        <div className={`${isSticky ? 'max-w-6xl mx-auto px-4 py-3' : 'p-4'}`}>
          <form onSubmit={handleSubmit} className="relative">
            {/* Header when not sticky */}
            {!isSticky && (
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-gray-800">AI-Powered Search</h3>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  Smart Match
                </span>
              </div>
            )}

            <div className="relative flex items-center gap-2">
              {/* AI Icon */}
              <div className={`
                flex items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white
                ${isSticky ? 'h-8 w-8' : 'h-10 w-10'}
              `}>
                <Sparkles className={isSticky ? 'h-4 w-4' : 'h-5 w-5'} />
              </div>

              {/* Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsExpanded(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className={`
                    w-full bg-white border border-gray-200 rounded-xl
                    focus:ring-2 focus:ring-orange-400 focus:border-transparent
                    transition-all duration-200
                    ${isSticky ? 'py-2 px-4 text-sm' : 'py-3 px-4'}
                    ${isExpanded && !isSticky ? 'pr-20' : 'pr-12'}
                  `}
                  aria-label="AI search query"
                />
                
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search Button */}
              <button
                type="submit"
                disabled={!query.trim()}
                className={`
                  flex items-center justify-center rounded-xl font-medium
                  transition-all duration-200
                  ${query.trim()
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                  ${isSticky ? 'px-4 py-2 text-sm' : 'px-6 py-3'}
                `}
              >
                <Search className={isSticky ? 'h-4 w-4' : 'h-5 w-5'} />
                {!isSticky && <span className="ml-2">Search</span>}
              </button>
            </div>

            {/* Expanded suggestions when focused and not sticky */}
            {isExpanded && !isSticky && (
              <div className="mt-3 pt-3 border-t border-orange-100">
                <p className="text-xs text-gray-500 mb-2">Try searching for:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Pet-friendly near ELTE',
                    'Quiet studio for studying',
                    '2BR with balcony under 300k',
                    'Close to metro, furnished'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5
                        hover:bg-orange-50 hover:border-orange-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Collapse button when sticky */}
          {isSticky && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hidden sm:block"
              aria-label={isExpanded ? 'Collapse search' : 'Expand search'}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
