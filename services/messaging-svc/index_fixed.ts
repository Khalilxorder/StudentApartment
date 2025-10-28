// Messaging Service - In-app communication system
// Handles messages between students and apartment owners

import { createClient } from '@/utils/supabaseClient';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'system';
  timestamp: Date;
  read: boolean;
  readAt?: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  apartmentId: string;
  lastMessage?: Message;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageThread {
  conversation: Conversation;
  messages: Message[];
  participants: Array<{
    userId: string;
    name: string;
    avatar?: string;
    verified: boolean;
  }>;
}

export class MessagingService {
  async createConversation(
    initiatorId: string,
    recipientId: string,
    apartmentId: string,
    initialMessage: string
  ): Promise<string> {
    // Check if conversation already exists
    const existingConversation = await this.findExistingConversation(
      initiatorId,
      recipientId,
      apartmentId
    );

    if (existingConversation) {
      // Add message to existing conversation
      await this.sendMessage(existingConversation.id, initiatorId, initialMessage);
      return existingConversation.id;
    }

    // Create conversation ID from apartment and participants
    const conversationId = this.buildConversationId(apartmentId, [initiatorId, recipientId]);

    // Send initial message (this implicitly creates the conversation)
    await this.sendMessage(conversationId, initiatorId, initialMessage);

    return conversationId;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'document' | 'system' = 'text'
  ): Promise<Message> {
    const conversation = await this.getConversation(conversationId);
    if (conversation && !conversation.participants.includes(senderId)) {
      throw new Error('User is not a participant in this conversation');
    }

    const recipientId = conversation
      ? conversation.participants.find(id => id !== senderId)!
      : this.extractRecipientFromConversationId(conversationId, senderId);

    const message: Message = {
      id: crypto.randomUUID(),
      conversationId,
      senderId,
      recipientId,
      content,
      type,
      timestamp: new Date(),
      read: false,
    };

    await this.storeMessage(message);
    await this.notifyRecipient(message);

    return message;
  }

  async getConversationThread(conversationId: string, userId: string): Promise<MessageThread | null> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return null;
    }

    const messages = await this.getMessages(conversationId);
    const participants = await this.getParticipants(conversation.participants);

    // Mark messages as read for this user
    await this.markMessagesAsRead(conversationId, userId);

    return {
      conversation,
      messages,
      participants,
    };
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    const conversations = await this.getUserConversationsFromDb(userId);
    return conversations.sort((a, b) =>
      (b.lastMessage?.timestamp.getTime() || 0) - (a.lastMessage?.timestamp.getTime() || 0)
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.getUserConversations(userId);
    return conversations.reduce((total, conv) => {
      return total + (conv.unreadCount.get(userId) || 0);
    }, 0);
  }

  // Private helper methods

  private async findExistingConversation(
    user1: string,
    user2: string,
    apartmentId: string
  ): Promise<Conversation | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .or(
        `and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`
      )
      .eq('apartment_id', apartmentId)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return this.getConversation(data[0].conversation_id);
  }

  private buildConversationId(apartmentId: string, participants: string[]): string {
    const sorted = [...participants].sort();
    return `${apartmentId}_${sorted[0]}_${sorted[1]}`;
  }

  private extractRecipientFromConversationId(conversationId: string, senderId: string): string {
    const parts = conversationId.split('_');
    return parts[1] === senderId ? parts[2] : parts[1];
  }

  private async storeMessage(message: Message): Promise<void> {
    const supabase = createClient();
    const apartmentId = message.conversationId.split('_')[0];

    const { error } = await supabase.from('messages').insert({
      conversation_id: message.conversationId,
      apartment_id: apartmentId,
      sender_id: message.senderId,
      receiver_id: message.recipientId,
      content: message.content,
      read: message.read,
      read_at: message.readAt,
      created_at: message.timestamp.toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to store message:', error);
      throw error;
    }
  }

  private async getConversation(conversationId: string): Promise<Conversation | null> {
    const supabase = createClient();

    const { data, error} = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return null;
    }

    const messages = data.map(this.mapRowToMessage.bind(this));
    const participants: string[] = Array.from(
      new Set(messages.flatMap((m: Message) => [m.senderId, m.recipientId]))
    );

    const unreadCount = new Map<string, number>();
    participants.forEach((userId: string) => {
      const count = messages.filter((m: Message) => m.recipientId === userId && !m.read).length;
      unreadCount.set(userId, count);
    });

    return {
      id: conversationId,
      participants,
      apartmentId: data[0].apartment_id,
      lastMessage: messages[0],
      createdAt: new Date(data[data.length - 1].created_at),
      updatedAt: new Date(data[0].created_at),
      unreadCount,
    };
  }

  private async getMessages(conversationId: string): Promise<Message[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(this.mapRowToMessage.bind(this));
  }

  private async getParticipants(userIds: string[]): Promise<
    Array<{
      userId: string;
      name: string;
      avatar?: string;
      verified: boolean;
    }>
  > {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, verified')
      .in('id', userIds);

    if (error || !data) {
      return userIds.map(id => ({
        userId: id,
        name: `User ${id.slice(0, 8)}`,
        verified: false,
      }));
    }

    return data.map((user: any) => ({
      userId: user.id,
      name: user.full_name || `User ${user.id.slice(0, 8)}`,
      avatar: user.avatar_url || undefined,
      verified: user.verified ?? false,
    }));
  }

  private async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('messages')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }

  private async getUserConversationsFromDb(userId: string): Promise<Conversation[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    const uniqueConversationIds: string[] = Array.from(
      new Set(data.map((row: any) => row.conversation_id).filter(Boolean))
    );

    const conversations = await Promise.all(
      uniqueConversationIds.map(id => this.getConversation(id!))
    );

    return conversations.filter((c): c is Conversation => c !== null);
  }

  private async notifyRecipient(message: Message): Promise<void> {
    // Integration point for notifications
    console.log(`Notifying ${message.recipientId} about new message`);
  }

  private mapRowToMessage(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      recipientId: row.receiver_id,
      content: row.content,
      type: 'text',
      timestamp: new Date(row.created_at),
      read: row.read,
      readAt: row.read_at ? new Date(row.read_at) : undefined,
    };
  }

  private hydrateConversation(conversationId: string, rows: any[]): Conversation {
    if (!rows || rows.length === 0) {
      throw new Error('Cannot hydrate conversation without messages');
    }

    const sortedRows = rows
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const messages = sortedRows.map(row => this.mapRowToMessage(row));

    const participants = Array.from(
      new Set(messages.flatMap((m: Message) => [m.senderId, m.recipientId]))
    );

    const unreadCount = new Map<string, number>();
    participants.forEach((userId: string) => {
      const count = messages.filter((m: Message) => m.recipientId === userId && !m.read).length;
      unreadCount.set(userId, count);
    });

    return {
      id: conversationId,
      participants,
      apartmentId: rows[0].apartment_id,
      lastMessage: messages[0],
      createdAt: new Date(rows[0].created_at),
      updatedAt: new Date(rows[0].created_at),
      unreadCount,
    };
  }
}

export const messagingService = new MessagingService();
