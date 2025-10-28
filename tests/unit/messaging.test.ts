/**
 * Unit Tests for Messaging Utilities
 * Tests message sending, conversation management, and real-time features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  sendMessage,
  getConversation,
  getUserConversations,
  markMessagesAsRead,
  createConversation,
  validateMessage,
  sanitizeMessage,
  checkMessagePermissions,
} from '../../lib/messaging';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  })),
}));

describe('Messaging Utilities', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = (createClient as any)();
    // Reset all mocks
    Object.values(mockSupabase).forEach((method: any) => {
      if (typeof method.mockReset === 'function') {
        method.mockReset();
      }
    });
    mockSupabase.from.mockReturnThis();
    mockSupabase.rpc.mockReturnThis();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateMessage', () => {
    it('should validate valid message', () => {
      const message = {
        content: 'Hello, I am interested in your apartment',
        senderId: 'user123',
        conversationId: 'conv456',
      };

      const result = validateMessage(message);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty message', () => {
      const message = {
        content: '',
        senderId: 'user123',
        conversationId: 'conv456',
      };

      const result = validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message content cannot be empty');
    });

    it('should reject message that is too long', () => {
      const longContent = 'a'.repeat(2001);
      const message = {
        content: longContent,
        senderId: 'user123',
        conversationId: 'conv456',
      };

      const result = validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message content cannot exceed 2000 characters');
    });

    it('should reject message without sender ID', () => {
      const message = {
        content: 'Hello',
        conversationId: 'conv456',
      };

      const result = validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sender ID is required');
    });

    it('should reject message without conversation ID', () => {
      const message = {
        content: 'Hello',
        senderId: 'user123',
      };

      const result = validateMessage(message);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Conversation ID is required');
    });
  });

  describe('sanitizeMessage', () => {
    it('should sanitize basic message', () => {
      const message = 'Hello <script>alert("xss")</script> world';
      const sanitized = sanitizeMessage(message);

      expect(sanitized).toBe('Hello  world');
    });

    it('should preserve allowed HTML', () => {
      const message = 'Hello <strong>world</strong> and <em>everyone</em>';
      const sanitized = sanitizeMessage(message);

      expect(sanitized).toBe('Hello <strong>world</strong> and <em>everyone</em>');
    });

    it('should handle empty message', () => {
      const sanitized = sanitizeMessage('');
      expect(sanitized).toBe('');
    });

    it('should handle null message', () => {
      const sanitized = sanitizeMessage(null as any);
      expect(sanitized).toBe('');
    });
  });

  describe('checkMessagePermissions', () => {
    it('should allow message between apartment owner and interested student', async () => {
      const mockConversation = {
        id: 'conv123',
        apartment_id: 'apt456',
        participants: ['student123', 'owner789'],
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                participants: ['student123', 'owner789'],
                apartment_id: 'apt123'
              },
              error: null,
            }),
          })),
        })),
      });

      const result = await checkMessagePermissions('student123', 'conv123', mockSupabase);

      expect(result.allowed).toBe(true);
    });

    it('should deny message from non-participant', async () => {
      const mockConversation = {
        id: 'conv123',
        participants: ['student123', 'owner789'],
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockConversation,
              error: null,
            }),
          })),
        })),
      });

      const result = await checkMessagePermissions('intruder999', 'conv123', mockSupabase);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User is not a participant in this conversation');
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          })),
        })),
      });

      const result = await checkMessagePermissions('student123', 'conv123', mockSupabase);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Database error');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const messageData = {
        content: 'Hello, interested in your apartment',
        senderId: 'student123',
        conversationId: 'conv456',
      };

      // Mock for checkMessagePermissions
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                participants: ['student123', 'owner789'],
                apartment_id: 'apt123'
              },
              error: null,
            }),
          })),
        })),
      });

      // Mock for message insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'msg789',
                ...messageData,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          })),
        })),
      });

      // Mock for conversation update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      });

      const result = await sendMessage(messageData, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.message?.id).toBe('msg789');
      expect(result.message?.content).toBe(messageData.content);
    });

    it('should handle validation failure', async () => {
      const messageData = {
        content: '',
        senderId: 'student123',
        conversationId: 'conv456',
      };

      const result = await sendMessage(messageData, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message content cannot be empty');
    });

    it('should handle database error', async () => {
      const messageData = {
        content: 'Hello',
        senderId: 'student123',
        conversationId: 'conv456',
      };

      // Mock for checkMessagePermissions
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                participants: ['student123', 'owner789'],
                apartment_id: 'apt123'
              },
              error: null,
            }),
          })),
        })),
      });

      // Mock for failed insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          })),
        })),
      });

      const result = await sendMessage(messageData, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('getConversation', () => {
    it('should get conversation with messages', async () => {
      const mockConversation = {
        id: 'conv123',
        apartment_id: 'apt456',
        participants: ['student123', 'owner789'],
        messages: [
          {
            id: 'msg1',
            content: 'Hello',
            sender_id: 'student123',
            created_at: '2024-01-01T10:00:00Z',
          },
          {
            id: 'msg2',
            content: 'Hi there',
            sender_id: 'owner789',
            created_at: '2024-01-01T10:05:00Z',
          },
        ],
      };

      // Mock checkMessagePermissions call
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { participants: ['student123', 'owner789'], apartment_id: 'apt456' },
              error: null,
            }),
          })),
        })),
      });

      // Mock getConversation call
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockConversation,
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await getConversation('conv123', 'student123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.conversation?.id).toBe('conv123');
      expect(result.conversation?.messages).toHaveLength(2);
    });

    it('should deny access to non-participant', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: {
                  id: 'conv123',
                  participants: ['student123', 'owner789'],
                },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await getConversation('conv123', 'intruder999', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied: not a participant');
    });
  });

  describe('getUserConversations', () => {
    it('should get user conversations', async () => {
      const mockConversations = [
        {
          id: 'conv1',
          apartment_id: 'apt1',
          participants: ['student123', 'owner1'],
          last_message: {
            content: 'Still available?',
            created_at: '2024-01-01T10:00:00Z',
          },
          unread_count: 2,
        },
        {
          id: 'conv2',
          apartment_id: 'apt2',
          participants: ['student123', 'owner2'],
          last_message: {
            content: 'Yes, come see it',
            created_at: '2024-01-02T10:00:00Z',
          },
          unread_count: 0,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockConversations,
        error: null,
      });

      const result = await getUserConversations('student123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.conversations).toHaveLength(2);
      expect(result.conversations?.[0].id).toBe('conv1');
    });

    it('should handle empty conversations', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getUserConversations('student123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.conversations).toEqual([]);
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              is: vi.fn().mockResolvedValue({
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await markMessagesAsRead('conv123', 'student123', mockSupabase);

      expect(result.success).toBe(true);
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              is: vi.fn().mockResolvedValue({
                error: { message: 'Update failed' },
              }),
            })),
          })),
        })),
      });

      const result = await markMessagesAsRead('conv123', 'student123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('createConversation', () => {
    it('should create conversation successfully', async () => {
      const conversationData = {
        apartmentId: 'apt456',
        participants: ['student123', 'owner789'],
        initialMessage: 'Hello, interested in your apartment',
      };

      // Mock check for existing conversation (returns null)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            contains: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        })),
      });

      // Mock insert conversation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'conv123',
                apartment_id: 'apt456',
                participants: ['student123', 'owner789'],
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          })),
        })),
      });

      // Mock sendMessage for initial message
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({
            data: { id: 'msg123' },
            error: null,
          }),
        })),
      });

      const result = await createConversation(conversationData, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.conversation?.id).toBe('conv123');
    });

    it('should validate participants', async () => {
      const conversationData = {
        apartmentId: 'apt456',
        participants: ['student123'], // Only one participant
        initialMessage: 'Hello',
      };

      const result = await createConversation(conversationData, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least two participants required');
    });

    it('should handle database error', async () => {
      const conversationData = {
        apartmentId: 'apt456',
        participants: ['student123', 'owner789'],
        initialMessage: 'Hello',
      };

      // Mock check for existing conversation (returns null)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            contains: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        })),
      });

      // Mock insert conversation (fails)
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          })),
        })),
      });

      const result = await createConversation(conversationData, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });
});