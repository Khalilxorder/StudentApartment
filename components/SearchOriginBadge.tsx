// FILE: components/SearchOriginBadge.tsx
// Displays search result origin (Structured/Semantic/AI) with visual indicators

import React from 'react';

export type SearchOrigin = 'structured' | 'semantic' | 'ai-scored' | 'keyword' | 'fallback';

interface SearchOriginBadgeProps {
  origin: SearchOrigin;
  score?: number;
  onClick?: () => void;
  className?: string;
}

export function SearchOriginBadge({
  origin,
  score,
  onClick,
  className = ''
}: SearchOriginBadgeProps) {
  const badgeConfigs: Record<SearchOrigin, { icon: string; label: string; bgColor: string; textColor: string; description: string }> = {
    'structured': {
      icon: '🔍',
      label: 'Structured',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      description: 'Filtered by your criteria'
    },
    'semantic': {
      icon: '🧠',
      label: 'Semantic',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      description: 'AI understood your needs'
    },
    'ai-scored': {
      icon: '⭐',
      label: 'AI Scored',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      description: 'Ranked by AI personalization'
    },
    'keyword': {
      icon: '📝',
      label: 'Keyword',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      description: 'Text search match'
    },
    'fallback': {
      icon: '⚙️',
      label: 'Fallback',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      description: 'Search service fallback'
    }
  };

  const config = badgeConfigs[origin];

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${config.bgColor} ${config.textColor} hover:opacity-80 cursor-pointer ${className}`}
      title={config.description}
      aria-label={`${config.label} search result. ${config.description}${score ? `. Match score: ${score}%` : ''}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {score !== undefined && score > 0 && (
        <span className="font-semibold ml-0.5">{Math.round(score)}%</span>
      )}
    </button>
  );
}

/**
 * Determine search origin based on result metadata
 */
export function determineSearchOrigin(result: any): SearchOrigin {
  if (result.aiScore !== undefined && result.aiScore !== null) {
    return 'ai-scored';
  }
  if (result.powered_by === 'semantic') {
    return 'semantic';
  }
  if (result.powered_by === 'keyword') {
    return 'keyword';
  }
  if (result.powered_by === 'fallback') {
    return 'fallback';
  }
  // Default to structured if it came from structured search
  return 'structured';
}

/**
 * Get score value for badge display
 */
export function getScoreForDisplay(result: any): number | undefined {
  if (result.aiScore !== undefined && result.aiScore !== null) {
    return result.aiScore;
  }
  if (result.featureMatchScore !== undefined && result.featureMatchScore !== null) {
    return result.featureMatchScore;
  }
  if (result.score !== undefined && result.score !== null) {
    return result.score;
  }
  return undefined;
}

export default SearchOriginBadge;
