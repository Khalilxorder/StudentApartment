// FILE: tests/search-origin-badge.test.ts
// Unit tests for SearchOriginBadge component

import { describe, it, expect } from 'vitest';
import { determineSearchOrigin, getScoreForDisplay, type SearchOrigin } from '@/components/SearchOriginBadge';

describe('SearchOriginBadge', () => {
  describe('determineSearchOrigin', () => {
    it('should return ai-scored when aiScore is present', () => {
      const result = { aiScore: 85, featureMatchScore: 75 };
      expect(determineSearchOrigin(result)).toBe('ai-scored');
    });

    it('should return ai-scored for aiScore of 0', () => {
      const result = { aiScore: 0 };
      expect(determineSearchOrigin(result)).toBe('ai-scored');
    });

    it('should return semantic when powered_by is semantic', () => {
      const result = { powered_by: 'semantic' };
      expect(determineSearchOrigin(result)).toBe('semantic');
    });

    it('should prioritize aiScore over powered_by', () => {
      const result = { aiScore: 80, powered_by: 'semantic' };
      expect(determineSearchOrigin(result)).toBe('ai-scored');
    });

    it('should return keyword when powered_by is keyword', () => {
      const result = { powered_by: 'keyword' };
      expect(determineSearchOrigin(result)).toBe('keyword');
    });

    it('should return fallback when powered_by is fallback', () => {
      const result = { powered_by: 'fallback' };
      expect(determineSearchOrigin(result)).toBe('fallback');
    });

    it('should return structured for empty/unknown results', () => {
      const result = {};
      expect(determineSearchOrigin(result)).toBe('structured');
    });

    it('should return structured when no matching field found', () => {
      const result = { featureMatchScore: 70, title: 'Apartment' };
      expect(determineSearchOrigin(result)).toBe('structured');
    });

    it('should handle null values gracefully', () => {
      const result = { aiScore: null, powered_by: null };
      expect(determineSearchOrigin(result)).toBe('structured');
    });

    it('should handle undefined values gracefully', () => {
      const result = { aiScore: undefined, powered_by: undefined };
      expect(determineSearchOrigin(result)).toBe('structured');
    });

    it('should ignore unknown powered_by values', () => {
      const result = { powered_by: 'unknown_source' };
      expect(determineSearchOrigin(result)).toBe('structured');
    });

    it('should work with full apartment result objects', () => {
      const fullResult = {
        id: 'apt-1',
        title: 'Beautiful 2BR Apartment',
        price_huf: 150000,
        bedrooms: 2,
        aiScore: 92,
        aiReasons: ['Near metro', 'Good price'],
        scoringSuccess: true
      };
      expect(determineSearchOrigin(fullResult)).toBe('ai-scored');
    });
  });

  describe('getScoreForDisplay', () => {
    it('should return aiScore when present', () => {
      const result = { aiScore: 85 };
      expect(getScoreForDisplay(result)).toBe(85);
    });

    it('should return featureMatchScore if no aiScore', () => {
      const result = { featureMatchScore: 75 };
      expect(getScoreForDisplay(result)).toBe(75);
    });

    it('should return score field as fallback', () => {
      const result = { score: 65 };
      expect(getScoreForDisplay(result)).toBe(65);
    });

    it('should prioritize aiScore over featureMatchScore', () => {
      const result = { aiScore: 90, featureMatchScore: 70 };
      expect(getScoreForDisplay(result)).toBe(90);
    });

    it('should prioritize featureMatchScore over score', () => {
      const result = { featureMatchScore: 75, score: 60 };
      expect(getScoreForDisplay(result)).toBe(75);
    });

    it('should follow precedence: aiScore > featureMatchScore > score', () => {
      const result = { aiScore: 95, featureMatchScore: 80, score: 70 };
      expect(getScoreForDisplay(result)).toBe(95);
    });

    it('should return undefined when no score field present', () => {
      const result = { title: 'Apartment', price_huf: 150000 };
      expect(getScoreForDisplay(result)).toBeUndefined();
    });

    it('should return 0 if aiScore is 0', () => {
      const result = { aiScore: 0 };
      expect(getScoreForDisplay(result)).toBe(0);
    });

    it('should handle null values by skipping to next field', () => {
      const result = { aiScore: null, featureMatchScore: 75 };
      expect(getScoreForDisplay(result)).toBe(75);
    });

    it('should handle undefined values by skipping to next field', () => {
      const result = { aiScore: undefined, featureMatchScore: 70, score: 60 };
      expect(getScoreForDisplay(result)).toBe(70);
    });

    it('should return undefined when all score fields are null/undefined', () => {
      const result = { aiScore: null, featureMatchScore: undefined, score: null };
      expect(getScoreForDisplay(result)).toBeUndefined();
    });

    it('should handle scores between 0-100', () => {
      expect(getScoreForDisplay({ aiScore: 0 })).toBe(0);
      expect(getScoreForDisplay({ aiScore: 50 })).toBe(50);
      expect(getScoreForDisplay({ aiScore: 100 })).toBe(100);
    });

    it('should handle decimal scores', () => {
      expect(getScoreForDisplay({ aiScore: 85.5 })).toBe(85.5);
      expect(getScoreForDisplay({ featureMatchScore: 72.3 })).toBe(72.3);
    });
  });

  describe('Origin determination with complex results', () => {
    it('should handle AI-scored results with all fields', () => {
      const result = {
        id: 'apt-1',
        aiScore: 88,
        featureMatchScore: 75,
        powered_by: 'semantic',
        aiReasons: ['Good location', 'Great price'],
        scoringSuccess: true
      };
      expect(determineSearchOrigin(result)).toBe('ai-scored');
      expect(getScoreForDisplay(result)).toBe(88);
    });

    it('should handle semantic results without AI scores', () => {
      const result = {
        id: 'apt-2',
        powered_by: 'semantic',
        featureMatchScore: 82,
        score: 78
      };
      expect(determineSearchOrigin(result)).toBe('semantic');
      expect(getScoreForDisplay(result)).toBe(82);
    });

    it('should handle keyword results without semantic info', () => {
      const result = {
        id: 'apt-3',
        powered_by: 'keyword',
        score: 65
      };
      expect(determineSearchOrigin(result)).toBe('keyword');
      expect(getScoreForDisplay(result)).toBe(65);
    });

    it('should handle minimal structured results', () => {
      const result = {
        id: 'apt-4',
        title: 'Apartment'
      };
      expect(determineSearchOrigin(result)).toBe('structured');
      expect(getScoreForDisplay(result)).toBeUndefined();
    });

    it('should handle results with only origin hint', () => {
      const result = {
        id: 'apt-5',
        powered_by: 'fallback'
      };
      expect(determineSearchOrigin(result)).toBe('fallback');
      expect(getScoreForDisplay(result)).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty object', () => {
      expect(determineSearchOrigin({})).toBe('structured');
      expect(getScoreForDisplay({})).toBeUndefined();
    });

    it('should handle very large scores', () => {
      expect(getScoreForDisplay({ aiScore: 9999 })).toBe(9999);
    });

    it('should handle negative scores', () => {
      expect(getScoreForDisplay({ aiScore: -10 })).toBe(-10);
    });

    it('should handle NaN values', () => {
      const result = { aiScore: NaN };
      const score = getScoreForDisplay(result);
      expect(Number.isNaN(score)).toBe(true);
    });

    it('should handle Infinity', () => {
      expect(getScoreForDisplay({ aiScore: Infinity })).toBe(Infinity);
    });

    it('should be case-sensitive for powered_by', () => {
      const result1 = { powered_by: 'SEMANTIC' };
      const result2 = { powered_by: 'Semantic' };
      expect(determineSearchOrigin(result1)).toBe('structured');
      expect(determineSearchOrigin(result2)).toBe('structured');
    });

    it('should handle whitespace in powered_by', () => {
      const result = { powered_by: ' semantic ' };
      expect(determineSearchOrigin(result)).toBe('structured');
    });
  });

  describe('Performance', () => {
    it('should determine origin quickly for typical result', () => {
      const result = {
        id: 'apt-1',
        title: 'Apartment',
        aiScore: 85,
        featureMatchScore: 75,
        powered_by: 'semantic'
      };
      
      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        determineSearchOrigin(result);
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.1); // Less than 0.1ms per call
    });

    it('should get score quickly for typical result', () => {
      const result = {
        aiScore: 85,
        featureMatchScore: 75,
        score: 65
      };
      
      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        getScoreForDisplay(result);
      }
      const end = performance.now();
      
      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(0.1); // Less than 0.1ms per call
    });
  });
});
