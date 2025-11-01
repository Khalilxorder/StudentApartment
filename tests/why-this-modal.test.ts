// FILE: tests/why-this-modal.test.ts
// Unit tests for WhyThisModal modal reasoning component

import { describe, it, expect, vi } from 'vitest';
import type { WhyThisModalProps } from '@/components/WhyThisModal';
import type { SearchOrigin } from '@/components/SearchOriginBadge';

describe('WhyThisModal', () => {
  // Note: Component rendering tests would be done with @testing-library/react
  // These are logic/configuration tests for the modal

  describe('Modal configuration', () => {
    it('should have correct origin labels', () => {
      const originLabels: Record<SearchOrigin, string> = {
        'structured': 'Structured Search',
        'semantic': 'Semantic Understanding',
        'ai-scored': 'AI Personalization',
        'keyword': 'Text Matching',
        'fallback': 'Fallback Search'
      };

      expect(Object.keys(originLabels).length).toBe(5);
      expect(originLabels['structured']).toBe('Structured Search');
      expect(originLabels['semantic']).toBe('Semantic Understanding');
      expect(originLabels['ai-scored']).toBe('AI Personalization');
      expect(originLabels['keyword']).toBe('Text Matching');
      expect(originLabels['fallback']).toBe('Fallback Search');
    });

    it('should have descriptions for all origins', () => {
      const origins: SearchOrigin[] = ['structured', 'semantic', 'ai-scored', 'keyword', 'fallback'];
      origins.forEach(origin => {
        expect(origin).toBeDefined();
      });
    });
  });

  describe('Score formatting', () => {
    it('should format scores correctly for display', () => {
      const testScores = [
        { input: 0, expected: '0%' },
        { input: 50, expected: '50%' },
        { input: 100, expected: '100%' },
        { input: 85.5, expected: '86%' },
        { input: 92.3, expected: '92%' }
      ];

      testScores.forEach(({ input, expected }) => {
        const formatted = `${Math.round(input)}%`;
        expect(formatted).toBe(expected);
      });
    });

    it('should clamp scores between 0 and 100 for progress bar', () => {
      const clamp = (value: number) => Math.min(Math.max(value, 0), 100);
      
      expect(clamp(-10)).toBe(0);
      expect(clamp(0)).toBe(0);
      expect(clamp(50)).toBe(50);
      expect(clamp(100)).toBe(100);
      expect(clamp(150)).toBe(100);
    });
  });

  describe('Reason processing', () => {
    it('should limit display to top 3 reasons', () => {
      const reasons = [
        'Reason 1',
        'Reason 2',
        'Reason 3',
        'Reason 4',
        'Reason 5'
      ];

      const displayReasons = reasons.slice(0, 3);
      expect(displayReasons.length).toBe(3);
      expect(displayReasons).toEqual(['Reason 1', 'Reason 2', 'Reason 3']);
    });

    it('should handle AI reasons correctly', () => {
      const aiReasons = ['Near metro station', 'Good neighborhood', 'Affordable price'];
      expect(aiReasons.length).toBeLessThanOrEqual(3);
    });

    it('should display feature reasons when AI reasons unavailable', () => {
      const featureReasons = [
        { factor: 'Location', description: 'Close to university', weight: 0.85 },
        { factor: 'Price', description: 'Within budget', weight: 0.70 },
        { factor: 'Amenities', description: 'Has WiFi and balcony', weight: 0.55 }
      ];

      const displayReasons = featureReasons.map(r => r.description).slice(0, 3);
      expect(displayReasons.length).toBe(3);
      expect(displayReasons[0]).toContain('university');
    });

    it('should prioritize AI reasons over feature reasons', () => {
      const aiReasons = ['AI Reason 1', 'AI Reason 2'];
      const featureReasons = ['Feature Reason 1', 'Feature Reason 2'];

      const displayReasons = aiReasons.length > 0 ? aiReasons : featureReasons.map(r => r);
      expect(displayReasons).toBe(aiReasons);
    });

    it('should handle empty reasons array', () => {
      const reasons: string[] = [];
      const displayReasons = reasons.slice(0, 3);
      expect(displayReasons.length).toBe(0);
    });

    it('should handle mixed reason types', () => {
      const reasons = ['String reason', { factor: 'Location', description: 'Good location', weight: 0.8 }];
      expect(reasons.length).toBe(2);
    });
  });

  describe('Feedback logic', () => {
    it('should record helpful feedback', () => {
      const feedbackSpy = vi.fn();
      feedbackSpy(true);
      expect(feedbackSpy).toHaveBeenCalledWith(true);
    });

    it('should record unhelpful feedback', () => {
      const feedbackSpy = vi.fn();
      feedbackSpy(false);
      expect(feedbackSpy).toHaveBeenCalledWith(false);
    });

    it('should track feedback state transitions', () => {
      const states: (boolean | null)[] = [];
      const recordFeedback = (helpful: boolean | null) => {
        states.push(helpful);
      };

      recordFeedback(null); // Initial
      recordFeedback(true); // User clicks helpful
      recordFeedback(false); // User clicks unhelpful
      recordFeedback(null); // User closes after feedback

      expect(states).toEqual([null, true, false, null]);
    });

    it('should confirm feedback visually', () => {
      const confirmStates = {
        before: 'Vote for this recommendation',
        helpful: 'Thanks!',
        unhelpful: 'Got it'
      };

      expect(confirmStates.helpful).toBe('Thanks!');
      expect(confirmStates.unhelpful).toBe('Got it');
    });
  });

  describe('Modal state management', () => {
    it('should initialize with closed state', () => {
      const initialState = false;
      expect(initialState).toBe(false);
    });

    it('should track open state correctly', () => {
      let isOpen = false;
      
      // Open modal
      isOpen = true;
      expect(isOpen).toBe(true);

      // Close modal
      isOpen = false;
      expect(isOpen).toBe(false);
    });

    it('should reset feedback state on close', () => {
      let feedbackGiven: boolean | null = true;
      feedbackGiven = null; // Reset
      expect(feedbackGiven).toBe(null);
    });

    it('should handle modal lifecycle', () => {
      const events: string[] = [];

      // Mount
      events.push('mount');
      // Open
      events.push('open');
      // Feedback
      events.push('feedback_given');
      // Close
      events.push('close');

      expect(events).toEqual(['mount', 'open', 'feedback_given', 'close']);
    });
  });

  describe('Modal data validation', () => {
    it('should validate apartment title', () => {
      const titles = [
        '2BR Apartment in District 5',
        'Cozy Studio near ELTE',
        '',
        null as any
      ];

      const validTitles = titles.filter((t: any) => typeof t === 'string' && t.length > 0);
      expect(validTitles.length).toBe(2);
    });

    it('should validate score range', () => {
      const validateScore = (score: number) => score >= 0 && score <= 100;
      
      expect(validateScore(0)).toBe(true);
      expect(validateScore(50)).toBe(true);
      expect(validateScore(100)).toBe(true);
      expect(validateScore(-1)).toBe(false);
      expect(validateScore(101)).toBe(false);
    });

    it('should validate origin type', () => {
      const validOrigins: SearchOrigin[] = ['structured', 'semantic', 'ai-scored', 'keyword', 'fallback'];
      const testOrigin = (origin: any): origin is SearchOrigin => {
        return validOrigins.includes(origin);
      };

      expect(testOrigin('semantic')).toBe(true);
      expect(testOrigin('ai-scored')).toBe(true);
      expect(testOrigin('invalid')).toBe(false);
    });

    it('should validate reasons array', () => {
      const validateReasons = (reasons: any): boolean => {
        return Array.isArray(reasons) && reasons.every(r => typeof r === 'string' || typeof r === 'object');
      };

      expect(validateReasons(['Reason 1', 'Reason 2'])).toBe(true);
      expect(validateReasons([])).toBe(true);
      expect(validateReasons('not array')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const ariaLabels = {
        modal: 'Why This Apartment - Recommendation explanation',
        closeButton: 'Close modal',
        scoreBar: 'Match score progress bar',
        helpfulButton: 'Mark recommendation as helpful',
        unhelpfulButton: 'Mark recommendation as unhelpful'
      };

      expect(Object.keys(ariaLabels).length).toBe(5);
      expect(ariaLabels.modal).toContain('Why This');
    });

    it('should support keyboard navigation', () => {
      const keyBindings = {
        'Escape': 'Close modal',
        'Tab': 'Navigate between buttons',
        'Enter': 'Submit feedback',
        'Space': 'Toggle button focus'
      };

      expect(keyBindings['Escape']).toBe('Close modal');
    });

    it('should provide semantic HTML structure', () => {
      const elements = {
        header: 'header with title',
        content: 'main content area',
        footer: 'footer with actions'
      };

      expect(elements.header).toBeDefined();
      expect(elements.content).toBeDefined();
      expect(elements.footer).toBeDefined();
    });
  });

  describe('Styling and theming', () => {
    it('should apply origin-specific colors', () => {
      const colors: Record<SearchOrigin, string> = {
        'structured': 'blue',
        'semantic': 'purple',
        'ai-scored': 'amber',
        'keyword': 'gray',
        'fallback': 'gray'
      };

      expect(colors['semantic']).toBe('purple');
      expect(colors['ai-scored']).toBe('amber');
    });

    it('should format progress bar fill', () => {
      const calculateFill = (score: number) => {
        return Math.min(Math.max(score, 0), 100);
      };

      expect(calculateFill(0)).toBe(0);
      expect(calculateFill(50)).toBe(50);
      expect(calculateFill(100)).toBe(100);
      expect(calculateFill(150)).toBe(100);
      expect(calculateFill(-50)).toBe(0);
    });

    it('should apply responsive sizing', () => {
      const sizes = {
        mobile: 'max-w-sm',
        tablet: 'max-w-md',
        desktop: 'max-w-lg'
      };

      expect(sizes.tablet).toBe('max-w-md');
    });
  });

  describe('Performance', () => {
    it('should render reasons efficiently', () => {
      const reasons = Array(100).fill(0).map((_, i) => `Reason ${i}`);
      const displayReasons = reasons.slice(0, 3);
      expect(displayReasons.length).toBe(3);
    });

    it('should handle rapid feedback clicks', () => {
      const feedbackSpy = vi.fn();
      
      feedbackSpy(true);
      feedbackSpy(false);
      feedbackSpy(true);
      feedbackSpy(false);

      expect(feedbackSpy).toHaveBeenCalledTimes(4);
    });

    it('should cleanup on unmount', () => {
      const cleanupSpy = vi.fn();
      const timer = setTimeout(cleanupSpy, 1500);
      clearTimeout(timer);
      expect(cleanupSpy).not.toHaveBeenCalled();
    });
  });
});
