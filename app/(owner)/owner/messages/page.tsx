'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback, FormEvent, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { sanitizeUserInput } from '@/lib/sanitize';
import { createClient } from '@/utils/supabaseClient';

interface ConversationSummary {
  conversationId: string;
  apartmentId: string;
  apartmentTitle: string;
  apartmentImage: string;
  tenantId: string;
  tenantName: string;
  tenantEmail?: string;
  tenantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface MessageItem {
  id: string;
  conversationId: string;
  content: string;
  senderId: string;
  createdAt: string;
  read: boolean;
}

const buildConversationKey = (apartmentId: string, userA: string, userB: string) => {
  const sorted = [userA, userB].sort();
  return [apartmentId, ...sorted].join('::');
};

const mapRowToMessage = (row: any): MessageItem => ({
  id: row.id,
  conversationId: row.conversation_id,
  content: row.content,
  senderId: row.sender_id,
  createdAt: row.created_at,
  read: row.read,
});

export default function OwnerMessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const markConversationAsRead = useCallback(
    async (conversationId: string, userId: string) => {
      if (!conversationId || !userId) return;

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
        console.error('Failed to mark conversation as read:', error);
      }
    },
    [supabase]
  );

  const loadUserAndConversations = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        router.push('/login');
        return;
      }
      setUser(authUser);

      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id')
        .eq('owner_id', authUser.id);

      if (apartmentsError) {
        console.error('Failed to load apartments:', apartmentsError);
        return;
      }

      const apartmentIds = apartments?.map((apartment: any) => apartment.id) ?? [];
      if (apartmentIds.length === 0) {
        setConversations([]);
        setMessages([]);
        setSelectedConversationId(null);
        return;
      }

      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select(`
          conversation_id,
          conversation_key,
          apartment_id,
          sender_id,
          receiver_id,
          content,
          read,
          created_at,
          apartments(title, image_urls)
        `)
        .in('apartment_id', apartmentIds)
        .order('created_at', { ascending: false });

      if (messageError) {
        console.error('Failed to load messages:', messageError);
        return;
      }

      if (!messageData || messageData.length === 0) {
        setConversations([]);
        setMessages([]);
        setSelectedConversationId(null);
        return;
      }

      const grouped = new Map<string, any[]>();
      const profileIds = new Set<string>();

      messageData.forEach((row: any) => {
        const conversationId = row.conversation_id || row.conversation_key;
        if (!conversationId) {
          return;
        }
        if (!grouped.has(conversationId)) {
          grouped.set(conversationId, []);
        }
        grouped.get(conversationId)!.push(row);

        const tenantId = row.sender_id === authUser.id ? row.receiver_id : row.sender_id;
        if (tenantId) {
          profileIds.add(tenantId);
        }
      });

      let profileMap = new Map<string, any>();
      if (profileIds.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', Array.from(profileIds));

        if (profileError) {
          console.error('Failed to load tenant profiles:', profileError);
        } else if (profiles) {
          profileMap = new Map(profiles.map((profile: any) => [profile.id, profile]));
        }
      }

      const conversationList: ConversationSummary[] = Array.from(grouped.entries()).map(
        ([conversationId, rows]) => {
          const sortedRows = rows
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const latest = sortedRows[0];
          const tenantId = latest.sender_id === authUser.id ? latest.receiver_id : latest.sender_id;
          const tenantProfile = tenantId ? profileMap.get(tenantId) : undefined;
          const unreadCount = rows.filter(
            message => !message.read && message.receiver_id === authUser.id
          ).length;

          return {
            conversationId,
            apartmentId: latest.apartment_id,
            apartmentTitle: latest.apartments?.title || 'Untitled apartment',
            apartmentImage: latest.apartments?.image_urls?.[0] || '',
            tenantId,
            tenantName:
              tenantProfile?.full_name ||
              tenantProfile?.email ||
              (tenantId ? `Tenant ${tenantId.slice(0, 8)}` : 'Tenant'),
            tenantEmail: tenantProfile?.email,
            tenantAvatar: tenantProfile?.avatar_url || undefined,
            lastMessage: latest.content,
            lastMessageTime: latest.created_at,
            unreadCount,
          };
        }
      );

      conversationList.sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setConversations(conversationList);
      setSelectedConversationId(prev =>
        prev ?? (conversationList.length > 0 ? conversationList[0].conversationId : null)
      );
    } catch (error) {
      console.error('Error loading owner conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId || !user?.id) {
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load conversation messages:', error);
        return;
      }

      setMessages((data || []).map(mapRowToMessage));
      await markConversationAsRead(conversationId, user.id);
      setConversations(prev =>
        prev.map(conversation =>
          conversation.conversationId === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
      scrollToBottom();
    },
    [markConversationAsRead, scrollToBottom, supabase, user?.id]
  );

  const handleConversationSelect = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      loadMessages(conversationId);
    },
    [loadMessages]
  );

  const handleSendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user?.id || !selectedConversationId || !newMessage.trim()) {
        return;
      }

      const conversation = conversations.find(
        item => item.conversationId === selectedConversationId
      );
      if (!conversation || !conversation.tenantId) {
        console.error('Conversation metadata missing when sending message');
        return;
      }

      const sanitized = sanitizeUserInput(newMessage.trim());
      if (!sanitized) {
        return;
      }

      setSending(true);
      try {
        const conversationKey = buildConversationKey(
          conversation.apartmentId,
          user.id,
          conversation.tenantId
        );

        const { error } = await supabase.from('messages').insert({
          conversation_id: selectedConversationId,
          conversation_key: conversationKey,
          apartment_id: conversation.apartmentId,
          sender_id: user.id,
          receiver_id: conversation.tenantId,
          content: sanitized,
        });

        if (error) {
          throw error;
        }

        setNewMessage('');
        await loadMessages(selectedConversationId);
        await loadUserAndConversations();
      } catch (error) {
        console.error('Failed to send owner message:', error);
      } finally {
        setSending(false);
      }
    },
    [conversations, loadMessages, loadUserAndConversations, newMessage, selectedConversationId, supabase, user?.id]
  );

  useEffect(() => {
    loadUserAndConversations();
  }, [loadUserAndConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel('owner-dashboard-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload: any) => {
          const newRow = payload.new as any;
          if (!newRow) return;

          const involvesOwner =
            newRow.sender_id === user.id || newRow.receiver_id === user.id;
          if (!involvesOwner) {
            return;
          }

          if (selectedConversationId && newRow.conversation_id === selectedConversationId) {
            setMessages(prev => [...prev, mapRowToMessage(newRow)]);
            if (newRow.receiver_id === user.id) {
              await markConversationAsRead(selectedConversationId, user.id);
            }
            scrollToBottom();
          }

          await loadUserAndConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    loadUserAndConversations,
    markConversationAsRead,
    scrollToBottom,
    selectedConversationId,
    supabase,
    user?.id,
  ]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tenant Messages</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Conversations List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 lg:col-span-1">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
              <p className="text-sm text-gray-500 mt-1">
                Keep track of tenant questions and follow-ups.
              </p>
            </div>

            <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No tenant conversations yet. Replies will appear here.</p>
                </div>
              ) : (
                conversations.map(conversation => {
                  const isActive = conversation.conversationId === selectedConversationId;
                  return (
                    <button
                      key={conversation.conversationId}
                      onClick={() => handleConversationSelect(conversation.conversationId)}
                      className={`w-full text-left px-4 py-3 transition ${
                        isActive ? 'bg-yellow-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 flex-shrink-0">
                          {conversation.apartmentImage ? (
                            <img
                              src={conversation.apartmentImage}
                              alt={conversation.apartmentTitle}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 truncate">
                              {conversation.tenantName}
                            </h3>
                            {conversation.unreadCount > 0 && (
                              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-yellow-400 text-gray-900 rounded-full">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.apartmentTitle}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(conversation.lastMessageTime).toLocaleString()}
                          </p>
                          <p className="mt-1 text-sm text-gray-700 truncate">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 lg:col-span-3 flex flex-col">
            {selectedConversationId ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  {(() => {
                    const conversation = conversations.find(
                      c => c.conversationId === selectedConversationId
                    );
                    if (!conversation) return null;
                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{conversation.tenantName}</h3>
                          <p className="text-sm text-gray-500">
                            Re: {conversation.apartmentTitle}
                          </p>
                        </div>
                        <Link
                          href={`/apartments/${conversation.apartmentId}`}
                          className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium rounded-lg transition"
                        >
                          View Listing →
                        </Link>
                      </div>
                    );
                  })()}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map(message => {
                    const isOwn = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md px-4 py-2 rounded-lg ${
                            isOwn
                              ? 'bg-yellow-400 text-gray-900'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-gray-700' : 'text-gray-500'
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={event => setNewMessage(event.target.value)}
                      placeholder="Type your response..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg
                    className="w-20 h-20 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-lg font-medium text-gray-700">Select a conversation</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose a tenant conversation to view messages
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
