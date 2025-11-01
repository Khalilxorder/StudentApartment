// FILE: tests/owner-profile.test.ts
// Unit tests for owner profile functionality

import { describe, it, expect } from 'vitest';
import {
  calculateProfileCompletenessScore,
  getCompletenessLevel,
  getCompletenessPercentage
} from '@/types/owner-profile';
import type { OwnerProfile } from '@/types/owner-profile';

describe('Profile Completeness Scoring', () => {
  describe('calculateProfileCompletenessScore', () => {
    it('should return 0 for completely empty profile', () => {
      const profile: Partial<OwnerProfile> = {};
      expect(calculateProfileCompletenessScore(profile)).toBe(0);
    });

    it('should award 15 points for full_name', () => {
      const profile: Partial<OwnerProfile> = { full_name: 'John Doe' };
      expect(calculateProfileCompletenessScore(profile)).toBe(15);
    });

    it('should award 10 points for phone', () => {
      const profile: Partial<OwnerProfile> = { phone: '+36201234567' };
      expect(calculateProfileCompletenessScore(profile)).toBe(10);
    });

    it('should award 15 points for bio', () => {
      const profile: Partial<OwnerProfile> = { bio: 'I am an experienced property owner.' };
      expect(calculateProfileCompletenessScore(profile)).toBe(15);
    });

    it('should award 10 points for company_name', () => {
      const profile: Partial<OwnerProfile> = { company_name: 'Budapest Properties Ltd.' };
      expect(calculateProfileCompletenessScore(profile)).toBe(10);
    });

    it('should award 10 points for website', () => {
      const profile: Partial<OwnerProfile> = { website: 'https://example.com' };
      expect(calculateProfileCompletenessScore(profile)).toBe(10);
    });

    it('should award 15 points for specializations', () => {
      const profile: Partial<OwnerProfile> = { specializations: ['Student Housing'] };
      expect(calculateProfileCompletenessScore(profile)).toBe(15);
    });

    it('should award 15 points for multiple specializations', () => {
      const profile: Partial<OwnerProfile> = {
        specializations: ['Student Housing', 'Luxury Properties']
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(15);
    });

    it('should award 10 points for years_experience', () => {
      const profile: Partial<OwnerProfile> = { years_experience: '6-10' };
      expect(calculateProfileCompletenessScore(profile)).toBe(10);
    });

    it('should award 5 points for social link (facebook)', () => {
      const profile: Partial<OwnerProfile> = {
        social_links: { facebook: 'https://facebook.com/mypage', instagram: '', linkedin: '' }
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(5);
    });

    it('should award 5 points for social link (instagram)', () => {
      const profile: Partial<OwnerProfile> = {
        social_links: { facebook: '', instagram: 'https://instagram.com/myhandle', linkedin: '' }
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(5);
    });

    it('should award 5 points for social link (linkedin)', () => {
      const profile: Partial<OwnerProfile> = {
        social_links: { facebook: '', instagram: '', linkedin: 'https://linkedin.com/in/myprofile' }
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(5);
    });

    it('should NOT double-count multiple social links', () => {
      const profile: Partial<OwnerProfile> = {
        social_links: {
          facebook: 'https://facebook.com/mypage',
          instagram: 'https://instagram.com/myhandle',
          linkedin: 'https://linkedin.com/in/myprofile'
        }
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(5);
    });

    it('should calculate high completeness with all main fields filled', () => {
      const profile: Partial<OwnerProfile> = {
        full_name: 'John Doe',
        phone: '+36201234567',
        bio: 'Experienced property owner',
        company_name: 'Budapest Properties',
        website: 'https://example.com',
        specializations: ['Student Housing'],
        years_experience: '10+',
        license_number: 'LICENSE-12345',
        avatar_url: 'https://example.com/avatar.jpg',
        social_links: { facebook: 'https://facebook.com/mypage' }
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(100);
    });

    it('should cap score at 100 even if over-filled', () => {
      const profile: Partial<OwnerProfile> = {
        full_name: 'John Doe',
        phone: '+36201234567',
        bio: 'Bio text',
        company_name: 'Company',
        website: 'https://example.com',
        specializations: ['Student Housing', 'Luxury'],
        years_experience: '10+',
        social_links: { facebook: 'https://facebook.com/mypage' },
        // Extra fields that shouldn't affect score
        avatar_url: 'https://example.com/avatar.jpg',
        tax_id: '123456789'
      };
      expect(calculateProfileCompletenessScore(profile)).toBeLessThanOrEqual(100);
    });

    it('should ignore whitespace-only fields', () => {
      const profile: Partial<OwnerProfile> = {
        full_name: '   ',
        phone: '\t\n',
        bio: '   '
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(0);
    });

    it('should handle empty specializations array', () => {
      const profile: Partial<OwnerProfile> = {
        full_name: 'John',
        specializations: []
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(15);
    });

    it('should handle null specializations', () => {
      const profile: Partial<OwnerProfile> = {
        full_name: 'John',
        specializations: null
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(15);
    });

    it('should handle partial profile', () => {
      const profile: Partial<OwnerProfile> = {
        full_name: 'John Doe',
        phone: '+36201234567',
        bio: 'Bio text',
        company_name: 'Company'
      };
      expect(calculateProfileCompletenessScore(profile)).toBe(50);
    });
  });

  describe('getCompletenessLevel', () => {
    it('should return incomplete for scores < 25', () => {
      expect(getCompletenessLevel(0)).toBe('incomplete');
      expect(getCompletenessLevel(10)).toBe('incomplete');
      expect(getCompletenessLevel(24)).toBe('incomplete');
    });

    it('should return partial for scores 25-49', () => {
      expect(getCompletenessLevel(25)).toBe('partial');
      expect(getCompletenessLevel(35)).toBe('partial');
      expect(getCompletenessLevel(49)).toBe('partial');
    });

    it('should return good for scores 50-74', () => {
      expect(getCompletenessLevel(50)).toBe('good');
      expect(getCompletenessLevel(60)).toBe('good');
      expect(getCompletenessLevel(74)).toBe('good');
    });

    it('should return excellent for scores >= 75', () => {
      expect(getCompletenessLevel(75)).toBe('excellent');
      expect(getCompletenessLevel(90)).toBe('excellent');
      expect(getCompletenessLevel(100)).toBe('excellent');
    });
  });

  describe('getCompletenessPercentage', () => {
    it('should return percentage between 0 and 100', () => {
      expect(getCompletenessPercentage(0)).toBe(0);
      expect(getCompletenessPercentage(50)).toBe(50);
      expect(getCompletenessPercentage(100)).toBe(100);
    });

    it('should round score', () => {
      expect(getCompletenessPercentage(33.7)).toBe(34);
      expect(getCompletenessPercentage(33.4)).toBe(33);
    });

    it('should clamp negative scores to 0', () => {
      expect(getCompletenessPercentage(-10)).toBe(0);
    });

    it('should clamp scores > 100 to 100', () => {
      expect(getCompletenessPercentage(150)).toBe(100);
    });
  });
});
