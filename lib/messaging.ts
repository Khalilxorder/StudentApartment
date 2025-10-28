/**
 * Messaging Utilities
 * Handles real-time messaging, conversation management, and message validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create Supabase client - wrap in try-catch for test environments
let supabase: SupabaseClient;
try {
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
} catch (e) {
  // In test/missing-env environments, create a dummy client
  console.warn('Supabase initialization warning (expected in tests)');
  supabase = createClient('https://dummy.supabase.co', 'dummy-key');
}

// Helper function to get Supabase client (allows dependency injection for testing)
function getSupabaseClient(client?: SupabaseClient): SupabaseClient {
  return client || supabase;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  read_at?: string;
  message_type: 'text' | 'image' | 'system';
}

export interface Conversation {
  id: string;
  apartment_id: string;
  participants: string[];
  created_at: string;
  updated_at: string;
  last_message?: Message;
  unread_count?: number;
  messages?: Message[];
}

export interface MessageValidation {
  isValid: boolean;
  errors: string[];
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Validate message content and structure
 */
export function validateMessage(message: any): MessageValidation {
  const errors: string[] = [];

  if (typeof message.content !== 'string') {
    errors.push('Message content is required and must be a string');
  } else {
    if (message.content.trim().length === 0) {
      errors.push('Message content cannot be empty');
    }
    if (message.content.length > 2000) {
      errors.push('Message content cannot exceed 2000 characters');
    }
  }

  if (!message.senderId || typeof message.senderId !== 'string') {
    errors.push('Sender ID is required');
  }

  if (!message.conversationId || typeof message.conversationId !== 'string') {
    errors.push('Conversation ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize message content to prevent XSS
 */
export function sanitizeMessage(content: string | null): string {
  if (!content) return '';

  // Basic HTML sanitization - allow only safe tags
  const allowedTags = ['strong', 'em', 'u', 'br'];
  let sanitized = content;

  // Remove script tags and other dangerous elements
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, (tag) => {
    const tagName = tag.match(/<\/?([a-zA-Z]+)/)?.[1];
    if (tagName && allowedTags.includes(tagName.toLowerCase())) {
      return tag;
    }
    return '';
  });

  return sanitized.trim();
}

/**
 * Mask contact information in message content to prevent spam and protect privacy
 * Replaces phone numbers, email addresses, and other contact info with placeholders
 */
export function maskContactInfo(content: string): string {
  if (!content) return content;

  let masked = content;

  // Phone number patterns (Hungarian and international formats)
  const phonePatterns = [
    // Hungarian mobile: +36 20/30/70 XXX XXXX or 06 20/30/70 XXX XXXX
    /(\+?36|06)[ ]?([20-99])[ ]?(\d{3})[ ]?(\d{4})/g,
    // International format: +XX XXX XXX XXXX
    /(\+\d{1,3})[ ]?(\d{1,4})[ ]?(\d{1,4})[ ]?(\d{1,4})/g,
    // Local format: XXX-XXXX or XXX XXXX
    /(\d{3})[- ]?(\d{4})/g,
  ];

  // Replace phone numbers with placeholder
  phonePatterns.forEach(pattern => {
    masked = masked.replace(pattern, '[PHONE NUMBER HIDDEN]');
  });

  // Email address pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  masked = masked.replace(emailPattern, '[EMAIL HIDDEN]');

  // WhatsApp/Skype/Telegram handles
  const handlePatterns = [
    /@(\w+)/g,  // @username
    /(?:whatsapp|telegram|skype|viber|signal):\s*([@\w\s]+)/gi,
    /(?:wa|tg|sk):\s*([@\w\s]+)/gi,
  ];

  handlePatterns.forEach(pattern => {
    masked = masked.replace(pattern, '[CONTACT INFO HIDDEN]');
  });

  // Website URLs (but allow the platform's own domain)
  const urlPattern = /https?:\/\/(?!.*student-apartments\.com)[^\s]+/gi;
  masked = masked.replace(urlPattern, '[WEBSITE LINK HIDDEN]');

  return masked;
}

/**
 * Check if user has permission to send messages in a conversation
 */
export async function checkMessagePermissions(
  userId: string,
  conversationId: string,
  supabaseClient?: SupabaseClient
): Promise<PermissionCheck> {
  const client = getSupabaseClient(supabaseClient);

  try {
    // Get conversation details
    const { data: conversation, error } = await client
      .from('conversations')
      .select('participants, apartment_id')
      .eq('id', conversationId)
      .single();

    if (error) {
      return { allowed: false, reason: error.message };
    }

    if (!conversation) {
      return { allowed: false, reason: 'Conversation not found' };
    }

    // Check if user is a participant
    if (!conversation.participants.includes(userId)) {
      return { allowed: false, reason: 'User is not a participant in this conversation' };
    }

    // Additional checks could include:
    // - User verification status
    // - Account suspension status
    // - Rate limiting

    return { allowed: true };
  } catch (error) {
    return { allowed: false, reason: 'Permission check failed' };
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  messageData: {
    content: string;
    senderId: string;
    conversationId: string;
    messageType?: 'text' | 'image' | 'system';
  },
  supabaseClient?: SupabaseClient
): Promise<{ success: boolean; message?: Message; error?: string }> {
  const client = supabaseClient || getSupabaseClient();

  try {
    // Validate message
    const validation = validateMessage(messageData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Check permissions
    const permission = await checkMessagePermissions(messageData.senderId, messageData.conversationId, client);
    if (!permission.allowed) {
      return { success: false, error: permission.reason };
    }

    // Sanitize content
    const sanitizedContent = sanitizeMessage(messageData.content);

    // Mask contact information
    const maskedContent = maskContactInfo(sanitizedContent);

    // Insert message
    const { data: message, error } = await client
      .from('messages')
      .insert({
        content: maskedContent,
        sender_id: messageData.senderId,
        conversation_id: messageData.conversationId,
        message_type: messageData.messageType || 'text',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update conversation's updated_at timestamp
    await client
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', messageData.conversationId);

    return { success: true, message };
  } catch (error) {
    return { success: false, error: 'Failed to send message' };
  }
}

/**
 * Get conversation with messages
 */
export async function getConversation(
  conversationId: string,
  userId: string,
  supabaseClient = supabase
): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
  try {
    // Check permissions
    const permission = await checkMessagePermissions(userId, conversationId, supabaseClient);
    if (!permission.allowed) {
      return { success: false, error: 'Access denied: not a participant' };
    }

    // Get conversation with messages
    const { data: conversation, error } = await supabaseClient
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          content,
          sender_id,
          created_at,
          read_at,
          message_type
        )
      `)
      .eq('id', conversationId)
      .order('created_at', { foreignTable: 'messages', ascending: true })
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: 'Failed to get conversation' };
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  supabaseClient = supabase
): Promise<{ success: boolean; conversations?: Conversation[]; error?: string }> {
  try {
    // Use RPC function to get conversations with last message and unread count
    const { data: conversations, error } = await supabaseClient
      .rpc('get_user_conversations', { user_id: userId });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, conversations: conversations || [] };
  } catch (error) {
    return { success: false, error: 'Failed to get conversations' };
  }
}

/**
 * Mark messages as read in a conversation
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string,
  supabaseClient = supabase
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark messages as read' };
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(
  conversationData: {
    apartmentId: string;
    participants: string[];
    initialMessage?: string;
  },
  supabaseClient = supabase
): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
  try {
    // Validate participants
    if (!conversationData.participants || conversationData.participants.length < 2) {
      return { success: false, error: 'At least two participants required' };
    }

    // Check if conversation already exists between these participants for this apartment
    const { data: existingConversation } = await supabaseClient
      .from('conversations')
      .select('id')
      .eq('apartment_id', conversationData.apartmentId)
      .contains('participants', conversationData.participants)
      .single();

    if (existingConversation) {
      return { success: false, error: 'Conversation already exists between these participants' };
    }

    // Create conversation
    const { data: conversation, error } = await supabaseClient
      .from('conversations')
      .insert({
        apartment_id: conversationData.apartmentId,
        participants: conversationData.participants,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Send initial message if provided
    if (conversationData.initialMessage && conversationData.participants.length > 0) {
      await sendMessage({
        content: conversationData.initialMessage,
        senderId: conversationData.participants[0], // First participant sends initial message
        conversationId: conversation.id,
      }, supabaseClient);
    }

    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: 'Failed to create conversation' };
  }
}

/**
 * Subscribe to real-time message updates
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void,
  supabaseClient = supabase
) {
  const channel = supabaseClient
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabaseClient.removeChannel(channel);
    },
  };
}

/**
 * Get message statistics for analytics
 */
export async function getMessageStats(
  userId: string,
  supabaseClient = supabase
): Promise<{
  success: boolean;
  stats?: {
    totalConversations: number;
    totalMessages: number;
    unreadMessages: number;
    averageResponseTime: number;
  };
  error?: string;
}> {
  try {
    // This would typically use database aggregations
    // For now, return mock stats
    const stats = {
      totalConversations: 5,
      totalMessages: 47,
      unreadMessages: 3,
      averageResponseTime: 2.5, // hours
    };

    return { success: true, stats };
  } catch (error) {
    return { success: false, error: 'Failed to get message stats' };
  }
}