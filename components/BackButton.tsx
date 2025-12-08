'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  href?: string;
  label?: string;
  variant?: 'icon' | 'text' | 'pill';
  className?: string;
}

/**
 * Unified back navigation button with brand styling
 * Replaces text-based "← Back" with proper icon
 */
export function BackButton({
  href,
  label = 'Back',
  variant = 'icon',
  className = '',
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${className}`}
        aria-label={label}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${className}`}
      >
        <ChevronLeft className="h-4 w-4" />
        {label}
      </button>
    );
  }

  // Text variant with icon
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 rounded ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
