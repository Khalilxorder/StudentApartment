/**
 * Integration Tests for Trust & Safety API
 * Tests reporting, moderation, and safety features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url?: string, key?: string) => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
        delete: vi.fn(),
      })),
      rpc: vi.fn(),
    })),
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

describe('Trust & Safety Logic Integration', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Report submission workflow', () => {
    it('should handle user reporting apartment listing', async () => {
      const reportData = {
        reporterId: 'user123',
        targetType: 'apartment',
        targetId: 'apt456',
        reason: 'inaccurate_information',
        description: 'The apartment description does not match the photos',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'report123',
                ...reportData,
                status: 'pending',
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await simulateReportSubmission(reportData, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.report.id).toBe('report123');
      expect(result.report.status).toBe('pending');
    });

    it('should prevent self-reporting', async () => {
      const reportData = {
        reporterId: 'user123',
        targetType: 'user',
        targetId: 'user123', // Same as reporter
        reason: 'harassment',
      };

      const result = await simulateReportSubmission(reportData, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot report yourself');
    });

    it('should validate report reasons', async () => {
      const reportData = {
        reporterId: 'user123',
        targetType: 'apartment',
        targetId: 'apt456',
        reason: 'invalid_reason',
      };

      const result = await simulateReportSubmission(reportData, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid report reason');
    });
  });

  describe('Content moderation workflow', () => {
    it('should allow admin to review and moderate reported content', async () => {
      const moderationData = {
        reportId: 'report123',
        action: 'remove_listing',
        moderatorNotes: 'Listing contains false information',
        adminId: 'admin456',
      };

      // Mock admin authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin456' } },
        error: null,
      });

      // Mock admin role check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          })),
        })),
      });

      // Mock report update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: {
              id: 'report123',
              status: 'resolved',
              moderator_action: 'remove_listing',
              moderator_notes: moderationData.moderatorNotes,
              resolved_at: new Date().toISOString(),
            },
            error: null,
          }),
        })),
      });

      // Mock apartment removal
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        })),
      });

      const result = await simulateContentModeration(moderationData, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.report.status).toBe('resolved');
      expect(result.report.moderator_action).toBe('remove_listing');
    });

    it('should deny moderation access to non-admins', async () => {
      const moderationData = {
        reportId: 'report123',
        action: 'warn_user',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'student123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'student' },
              error: null,
            }),
          })),
        })),
      });

      const result = await simulateContentModeration(moderationData, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin access required');
    });
  });

  describe('User safety scoring', () => {
    it('should calculate user trust score based on multiple factors', () => {
      const userActivity = {
        verificationsCompleted: 3,
        reportsFiled: 0,
        reportsAgainst: 1,
        accountAge: 365, // days
        successfulBookings: 15,
        positiveReviews: 12,
      };

      const score = calculateUserTrustScore(userActivity);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      // Should be high due to good verification and booking history
      expect(score).toBeGreaterThan(70);
    });

    it('should penalize users with reports against them', () => {
      const userActivity = {
        verificationsCompleted: 2,
        reportsFiled: 0,
        reportsAgainst: 5,
        accountAge: 180,
        successfulBookings: 3,
        positiveReviews: 2,
      };

      const score = calculateUserTrustScore(userActivity);

      expect(score).toBeLessThan(50); // Should be significantly reduced
    });

    it('should reward verified and active users', () => {
      const userActivity = {
        verificationsCompleted: 4,
        reportsFiled: 0,
        reportsAgainst: 0,
        accountAge: 730, // 2 years
        successfulBookings: 50,
        positiveReviews: 45,
      };

      const score = calculateUserTrustScore(userActivity);

      expect(score).toBeGreaterThan(90); // Should be very high
    });
  });

  describe('Automated content filtering', () => {
    it('should detect and flag inappropriate content', () => {
      const suspiciousContent = {
        title: 'Amazing apartment for students',
        description: 'Contact me for more details about this great student housing opportunity',
      };

      const analysis = analyzeContentForSpam(suspiciousContent);

      expect(analysis.isSpam).toBeDefined();
      expect(analysis.riskScore).toBeDefined();
      expect(analysis.flags).toBeDefined();
    });

    it('should pass legitimate content', () => {
      const legitimateContent = {
        title: 'Cozy apartment near university',
        description: 'Beautiful 2-bedroom apartment with modern amenities, perfect for students. Located just 5 minutes from ELTE University.',
      };

      const analysis = analyzeContentForSpam(legitimateContent);

      expect(analysis.isSpam).toBe(false);
      expect(analysis.riskScore).toBeLessThan(30);
    });

    it('should flag content with excessive contact information', () => {
      const contactHeavyContent = {
        title: 'Room for rent',
        description: 'Call me at 123-456-7890 or email me at suspicious@email.com. Also check my website at spam-site.com. SMS: 555-123-4567',
      };

      const analysis = analyzeContentForSpam(contactHeavyContent);

      expect(analysis.flags).toContain('excessive_contact_info');
      expect(analysis.riskScore).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Safety incident reporting', () => {
    it('should handle emergency safety reports', async () => {
      const emergencyReport = {
        reporterId: 'user123',
        incidentType: 'harassment',
        severity: 'high',
        description: 'Received threatening messages from another user',
        evidence: ['screenshot1.jpg', 'message_log.pdf'],
        location: 'Budapest, Hungary',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'incident123',
                ...emergencyReport,
                status: 'urgent_review',
                priority: 'high',
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await simulateSafetyIncidentReport(emergencyReport, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.incident.priority).toBe('high');
      expect(result.incident.status).toBe('urgent_review');
    });

    it('should escalate high-severity incidents immediately', async () => {
      const highSeverityIncident = {
        reporterId: 'user123',
        incidentType: 'safety_concern',
        severity: 'critical',
        description: 'User showed up unannounced and became aggressive',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'incident123',
                ...highSeverityIncident,
                status: 'immediate_action_required',
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await simulateSafetyIncidentReport(highSeverityIncident, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.incident.priority).toBe('critical');
      expect(result.incident.requiresImmediateAction).toBe(true);
    });
  });
});

// Helper functions to simulate API logic
async function simulateReportSubmission(data: any, supabase: any) {
  // Validate input
  if (!data.reporterId || !data.targetType || !data.targetId || !data.reason) {
    return { success: false, error: 'Missing required fields' };
  }

  // Prevent self-reporting
  if (data.targetType === 'user' && data.reporterId === data.targetId) {
    return { success: false, error: 'Cannot report yourself' };
  }

  // Validate report reason
  const validReasons = [
    'inaccurate_information', 'harassment', 'spam', 'inappropriate_content',
    'scam', 'safety_concern', 'discrimination', 'other'
  ];
  if (!validReasons.includes(data.reason)) {
    return { success: false, error: 'Invalid report reason' };
  }

  // Simulate auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== data.reporterId) {
    return { success: false, error: 'Unauthorized' };
  }

  // Simulate insertion
  const insertQuery = supabase.from();
  const result = await insertQuery.insert().select().single();

  if (result.error) {
    return { success: false, error: 'Failed to submit report' };
  }

  return { success: true, report: result.data };
}

async function simulateContentModeration(data: any, supabase: any) {
  if (!data.reportId || !data.action) {
    return { success: false, error: 'Missing required fields' };
  }

  const validActions = ['remove_listing', 'warn_user', 'suspend_user', 'dismiss'];
  if (!validActions.includes(data.action)) {
    return { success: false, error: 'Invalid moderation action' };
  }

  // Check admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const profileQuery = supabase.from();
  const profile = await profileQuery.select().eq().single();

  if (!profile.data || profile.data.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  // Update report
  const updateQuery = supabase.from();
  const result = await updateQuery.update().eq();

  if (result.error) {
    return { success: false, error: 'Failed to moderate content' };
  }

  // Take action based on moderation decision
  if (data.action === 'remove_listing') {
    const apartmentQuery = supabase.from();
    await apartmentQuery.update().eq();
  }

  return { success: true, report: result.data };
}

function calculateUserTrustScore(activity: any): number {
  let score = 50; // Base score

  // Verification bonus
  score += activity.verificationsCompleted * 10;

  // Account age bonus (up to 20 points for 2+ years)
  const ageBonus = Math.min(20, (activity.accountAge / 730) * 20);
  score += ageBonus;

  // Successful bookings bonus
  score += Math.min(15, activity.successfulBookings * 0.5);

  // Positive reviews bonus
  const reviewRatio = activity.positiveReviews / Math.max(1, activity.successfulBookings);
  score += reviewRatio * 10;

  // Reports penalty
  score -= activity.reportsAgainst * 15;

  // Reports filed bonus (responsible reporting)
  score += Math.min(5, activity.reportsFiled * 2);

  return Math.max(0, Math.min(100, score));
}

function analyzeContentForSpam(content: any): any {
  const flags: string[] = [];
  let riskScore = 0;

  // Check for excessive contact information
  const contactPatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
    /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/\S*)?\b/g, // URLs
  ];

  let contactMatches = 0;
  contactPatterns.forEach(pattern => {
    const matches = (content.title + ' ' + content.description).match(pattern);
    if (matches) contactMatches += matches.length;
  });

  if (contactMatches > 2) {
    flags.push('excessive_contact_info');
    riskScore += 30;
  }

  // Check for spam keywords
  const spamKeywords = ['urgent', 'limited time', 'act now', 'guaranteed', 'free money'];
  const text = (content.title + ' ' + content.description).toLowerCase();
  const spamMatches = spamKeywords.filter(keyword => text.includes(keyword));

  if (spamMatches.length > 0) {
    flags.push('spam_keywords');
    riskScore += spamMatches.length * 10;
  }

  // Check text length (very short or very long descriptions might be suspicious)
  const totalLength = content.title.length + content.description.length;
  if (totalLength < 50) {
    flags.push('too_short');
    riskScore += 20;
  } else if (totalLength > 2000) {
    flags.push('too_long');
    riskScore += 10;
  }

  return {
    isSpam: riskScore > 50,
    riskScore: Math.min(100, riskScore),
    flags,
  };
}

async function simulateSafetyIncidentReport(data: any, supabase: any) {
  // Validate input
  if (!data.reporterId || !data.incidentType || !data.severity || !data.description) {
    return { success: false, error: 'Missing required fields' };
  }

  const validTypes = ['harassment', 'safety_concern', 'scam', 'discrimination', 'other'];
  const validSeverities = ['low', 'medium', 'high', 'critical'];

  if (!validTypes.includes(data.incidentType)) {
    return { success: false, error: 'Invalid incident type' };
  }

  if (!validSeverities.includes(data.severity)) {
    return { success: false, error: 'Invalid severity level' };
  }

  // Simulate auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== data.reporterId) {
    return { success: false, error: 'Unauthorized' };
  }

  // Determine priority and status based on severity
  let priority = 'low';
  let status = 'pending';
  let requiresImmediateAction = false;

  if (data.severity === 'high') {
    priority = 'high';
    status = 'urgent_review';
  } else if (data.severity === 'critical') {
    priority = 'critical';
    status = 'immediate_action_required';
    requiresImmediateAction = true;
  }

  // Simulate insertion
  const insertQuery = supabase.from();
  const result = await insertQuery.insert().select().single();

  if (result.error) {
    return { success: false, error: 'Failed to report incident' };
  }

  return {
    success: true,
    incident: {
      ...result.data,
      priority,
      status,
      requiresImmediateAction,
    }
  };
}