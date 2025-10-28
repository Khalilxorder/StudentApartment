import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the supabase client
const createMockQuery = (result: any = {}) => {
  const query = Object.assign(Promise.resolve(result), {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    csv: vi.fn().mockResolvedValue(result),
  });
  return query;
};

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabase,
}));

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn(),
    },
  })),
}));

describe('Notifications API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/notifications', () => {
    it('should send an email notification successfully', async () => {
      // Mock the database calls
      mockSupabase.from
        .mockReturnValueOnce(createMockQuery({
          data: {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
          },
          error: null,
        }))
        .mockReturnValueOnce(createMockQuery({
          data: { email: 'test@example.com', phone: null },
          error: null,
        }))
        .mockReturnValueOnce(createMockQuery({ error: null }));

      // Import the handler after mocking
      const { POST } = await import('@/app/api/notifications/route');

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'test-user-id',
          type: 'email',
          title: 'Test Notification',
          message: 'This is a test notification',
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Notification sent successfully');
    });

    it('should reject notification when user has disabled the channel', async () => {
      mockSupabase.from.mockReturnValue(createMockQuery({
        data: {
          email_enabled: false, // Email disabled
          sms_enabled: false,
          push_enabled: true,
        },
        error: null,
      }));

      const { POST } = await import('@/app/api/notifications/route');

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'test-user-id',
          type: 'email',
          title: 'Test Notification',
          message: 'This is a test notification',
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Notification type disabled by user preferences');
    });

    it('should handle template rendering', async () => {
      mockSupabase.from
        .mockReturnValueOnce(createMockQuery({
          data: {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
          },
          error: null,
        }))
        .mockReturnValueOnce(createMockQuery({
          data: {
            name: 'booking_confirmed_student',
            type: 'email',
            subject: 'Booking Confirmed - {{apartment_title}}',
            template: 'Dear {{student_name}}, your booking is confirmed.',
            variables: ['student_name', 'apartment_title'],
            active: true,
          },
          error: null,
        }))
        .mockReturnValueOnce(createMockQuery({
          data: { email: 'test@example.com', phone: null },
          error: null,
        }))
        .mockReturnValueOnce(createMockQuery({ error: null }));

      // Import the handler after mocking
      const { POST } = await import('@/app/api/notifications/route');

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'test-user-id',
          type: 'email',
          title: 'Booking Confirmed',
          message: 'Your booking has been confirmed',
          template_name: 'booking_confirmed_student',
          template_data: {
            student_name: 'John Doe',
            apartment_title: 'Beautiful Apartment',
          },
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Notification sent successfully');
    });

    it('should schedule notifications for future delivery', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      mockSupabase.from.mockReturnValue(createMockQuery({ error: null }));

      const { POST } = await import('@/app/api/notifications/route');

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'test-user-id',
          type: 'email',
          title: 'Scheduled Notification',
          message: 'This will be sent later',
          scheduled_for: futureDate.toISOString(),
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Notification scheduled successfully');
    });
  });

  describe('GET /api/notifications', () => {
    it('should return user notifications', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'email',
          title: 'Test Notification',
          message: 'Test message',
          read_at: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue(createMockQuery({
        data: mockNotifications,
        error: null,
      }));

      const { GET } = await import('@/app/api/notifications/route');

      const request = new NextRequest('http://localhost:3000/api/notifications?user_id=test-user-id');

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.notifications).toEqual(mockNotifications);
    });

    it('should filter unread notifications', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'email',
          title: 'Unread Notification',
          message: 'Test message',
          read_at: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue(createMockQuery({
        data: mockNotifications,
        error: null,
      }));

      const { GET } = await import('@/app/api/notifications/route');

      const request = new NextRequest('http://localhost:3000/api/notifications?user_id=test-user-id&unread_only=true');

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.notifications).toEqual(mockNotifications);
    });
  });

  describe('PATCH /api/notifications', () => {
    it('should mark notifications as read', async () => {
      mockSupabase.from.mockReturnValue(createMockQuery({ error: null }));

      const { PATCH } = await import('@/app/api/notifications/route');

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
          notification_ids: ['1', '2', '3'],
          action: 'mark_read',
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await PATCH(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Notifications marked as read');
    });
  });
});