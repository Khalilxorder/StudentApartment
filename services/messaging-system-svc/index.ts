// Messaging System Overhaul Service
// Real-time chat, contact masking, rate limiting, and encryption

import { createClient, createServiceClient } from '@/utils/supabaseClient';
import crypto from 'crypto';

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isEncrypted: boolean;
  encryptionKey?: string;
  createdAt: Date;
  readAt?: Date;
  attachments?: string[];
}

export interface ConversationThread {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: Date;
  messageCount: number;
  isBlocked: boolean;
  mutedFor?: 'participant1' | 'participant2';
}

export interface ContactMask {
  realUserId: string;
  maskedId: string;
  maskedEmail: string;
  maskedPhone?: string;
  revealedTo?: string[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface MessageRateLimit {
  userId: string;
  messagesInWindow: number;
  windowSize: number; // in ms
  limit: number;
  isExceeded: boolean;
}

export class MessagingSystemService {
  private MESSAGE_RATE_LIMIT = 10; // messages per hour
  private RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
  private ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private contactMasks: Map<string, ContactMask> = new Map();
  private messageBuffer: Map<string, Message[]> = new Map();

  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    options?: {
      encrypt?: boolean;
      attachments?: string[];
      apartmentId?: string;
    }
  ): Promise<Message | { error: string; retryAfter?: number }> {
    try {
      // Check rate limit
      const rateLimitCheck = await this.checkMessageRateLimit(senderId);
      if (rateLimitCheck.isExceeded) {
        return {
          error: 'Rate limit exceeded',
          retryAfter: this.RATE_LIMIT_WINDOW / 1000,
        };
      }

      // Check if sender/recipient are blocked
      const isBlocked = await this.areUsersBlocked(senderId, recipientId);
      if (isBlocked) {
        return { error: 'Cannot send message: user has blocked you or you have blocked this user' };
      }

      const supabase = createServiceClient();

      // Encrypt content if requested
      let messageContent = content;
      let isEncrypted = false;
      let encryptionKey: string | undefined;

      if (options?.encrypt !== false) {
        // Default to encryption
        const encrypted = this.encryptMessage(content);
        messageContent = encrypted.encryptedContent;
        encryptionKey = encrypted.key;
        isEncrypted = true;
      }

      // Create or get conversation thread
      const conversationId = this.getConversationId(senderId, recipientId);
      let thread = await this.getOrCreateThread(senderId, recipientId);

      // Store message
      const message: Message = {
        id: crypto.randomUUID(),
        senderId,
        recipientId,
        content: messageContent,
        isEncrypted,
        encryptionKey,
        createdAt: new Date(),
        attachments: options?.attachments,
      };

      const { error: insertError } = await supabase.from('messages').insert({
        id: message.id,
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        content: messageContent,
        is_encrypted: isEncrypted,
        encryption_key: encryptionKey,
        created_at: message.createdAt.toISOString(),
        apartment_id: options?.apartmentId,
        attachments: options?.attachments,
      });

      if (insertError) {
        throw insertError;
      }

      // Update conversation metadata
      await supabase
        .from('conversation_threads')
        .update({
          last_message_at: message.createdAt.toISOString(),
          message_count: (thread?.messageCount || 0) + 1,
        })
        .eq('id', conversationId);

      // Buffer for real-time delivery
      if (!this.messageBuffer.has(conversationId)) {
        this.messageBuffer.set(conversationId, []);
      }
      this.messageBuffer.get(conversationId)!.push(message);

      // Trigger real-time notification
      await this.notifyMessageReceived(recipientId, message);

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      return { error: 'Failed to send message' };
    }
  }

  async getConversation(
    userId: string,
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const supabase = createClient();

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return (messages || []).reverse().map((msg: any) => ({
        id: msg.id,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        content: msg.is_encrypted ? this.decryptMessage(msg.content, msg.encryption_key) : msg.content,
        isEncrypted: msg.is_encrypted,
        createdAt: new Date(msg.created_at),
        readAt: msg.read_at ? new Date(msg.read_at) : undefined,
        attachments: msg.attachments,
      }));
    } catch (error) {
      console.error('Failed to get conversation:', error);
      return [];
    }
  }

  async maskUserContact(userId: string, revealTo?: string[]): Promise<ContactMask> {
    try {
      const maskedId = crypto.randomUUID();
      const maskedEmail = `user-${maskedId.split('-')[0]}@masked.local`;
      const supabase = createServiceClient();

      // Get user's real phone (if exists)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('phone')
        .eq('user_id', userId)
        .single();

      // Create masked phone if real phone exists
      let maskedPhone: string | undefined;
      if (profile?.phone) {
        const phoneDigits = profile.phone.replace(/\D/g, '');
        maskedPhone = '+36 ' + '*'.repeat(7) + phoneDigits.slice(-3);
      }

      const mask: ContactMask = {
        realUserId: userId,
        maskedId,
        maskedEmail,
        maskedPhone,
        revealedTo: revealTo,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      this.contactMasks.set(maskedId, mask);

      // Store in database
      await supabase.from('contact_masks').insert({
        user_id: userId,
        masked_id: maskedId,
        masked_email: maskedEmail,
        masked_phone: maskedPhone,
        revealed_to: revealTo,
        created_at: mask.createdAt.toISOString(),
        expires_at: mask.expiresAt?.toISOString(),
      });

      return mask;
    } catch (error) {
      console.error('Failed to mask user contact:', error);
      throw error;
    }
  }

  async revealContact(maskedId: string, revealTo: string): Promise<{ email: string; phone?: string } | null> {
    try {
      const mask = this.contactMasks.get(maskedId);
      if (!mask) {
        console.warn(`Masked contact ${maskedId} not found`);
        return null;
      }

      // Verify expiration
      if (mask.expiresAt && new Date() > mask.expiresAt) {
        return null; // Contact mask has expired
      }

      // Get real contact info
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(mask.realUserId);
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('phone')
        .eq('user_id', mask.realUserId)
        .single();

      return {
        email: authUser?.email || '',
        phone: profile?.phone,
      };
    } catch (error) {
      console.error('Failed to reveal contact:', error);
      return null;
    }
  }

  private encryptMessage(content: string): { encryptedContent: string; key: string } {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

    let encryptedContent = cipher.update(content, 'utf8', 'hex');
    encryptedContent += cipher.final('hex');

    const authTag = (cipher as any).getAuthTag();
    const combined = iv.toString('hex') + authTag.toString('hex') + encryptedContent;

    return {
      encryptedContent: combined,
      key: key.toString('hex'),
    };
  }

  private decryptMessage(encryptedContent: string, keyHex?: string): string {
    if (!keyHex) {
      return '[Decryption failed: no key provided]';
    }

    try {
      const key = Buffer.from(keyHex, 'hex');
      const buffer = Buffer.from(encryptedContent, 'hex');

      const iv = buffer.slice(0, 16);
      const authTag = buffer.slice(16, 32);
      const encrypted = buffer.slice(32);

      const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
      (decipher as any).setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Decryption failed]';
    }
  }

  private getConversationId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `conv-${sorted[0]}-${sorted[1]}`;
  }

  private async getOrCreateThread(userId1: string, userId2: string): Promise<ConversationThread> {
    try {
      const conversationId = this.getConversationId(userId1, userId2);
      const supabase = createClient();

      const { data: existing } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (existing) {
        return {
          id: existing.id,
          participant1Id: existing.participant1_id,
          participant2Id: existing.participant2_id,
          lastMessageAt: new Date(existing.last_message_at),
          messageCount: existing.message_count,
          isBlocked: existing.is_blocked,
        };
      }

      // Create new thread
      const thread: ConversationThread = {
        id: conversationId,
        participant1Id: userId1,
        participant2Id: userId2,
        lastMessageAt: new Date(),
        messageCount: 0,
        isBlocked: false,
      };

      await supabase.from('conversation_threads').insert({
        id: thread.id,
        participant1_id: userId1,
        participant2_id: userId2,
        last_message_at: thread.lastMessageAt.toISOString(),
        message_count: 0,
        is_blocked: false,
      });

      return thread;
    } catch (error) {
      console.error('Failed to get or create thread:', error);
      throw error;
    }
  }

  private async checkMessageRateLimit(userId: string): Promise<MessageRateLimit> {
    try {
      const supabase = createClient();
      const since = new Date(Date.now() - this.RATE_LIMIT_WINDOW);

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', since.toISOString());

      const messagesInWindow = count || 0;

      return {
        userId,
        messagesInWindow,
        windowSize: this.RATE_LIMIT_WINDOW,
        limit: this.MESSAGE_RATE_LIMIT,
        isExceeded: messagesInWindow >= this.MESSAGE_RATE_LIMIT,
      };
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      return {
        userId,
        messagesInWindow: 0,
        windowSize: this.RATE_LIMIT_WINDOW,
        limit: this.MESSAGE_RATE_LIMIT,
        isExceeded: false,
      };
    }
  }

  private async areUsersBlocked(userId1: string, userId2: string): Promise<boolean> {
    try {
      const supabase = createClient();

      const { data: blocks } = await supabase
        .from('user_blocks')
        .select('*')
        .or(`and(blocker_id.eq.${userId1},blocked_user_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_user_id.eq.${userId1})`);

      return (blocks && blocks.length > 0) || false;
    } catch (error) {
      console.error('Failed to check block status:', error);
      return false;
    }
  }

  private async notifyMessageReceived(recipientId: string, message: Message): Promise<void> {
    try {
      // In production: trigger real-time notification via WebSocket/Supabase Realtime
      console.log(`Message notification for ${recipientId}: ${message.id}`);
    } catch (error) {
      console.error('Failed to notify message received:', error);
    }
  }
}

export const messagingSystemService = new MessagingSystemService();
