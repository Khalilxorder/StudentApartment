'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabaseClient';
import { sanitizeUserInput } from '@/lib/sanitize';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Conversation {
  conversation_key: string;
  apartment_id: string;
  apartment_title: string;
  apartment_image: string;
  tenant_email: string;
  tenant_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_email: string;
  created_at: string;
  read: boolean;
}

export default function OwnerMessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadUserAndConversations = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);

      // Get user's apartments
      const { data: apartments } = await supabase
        .from('apartments')
        .select('id')
        .eq('owner_id', authUser.id);

      if (!apartments || apartments.length === 0) {
        setLoading(false);
        return;
      }

      const apartmentIds = apartments.map((apt) => apt.id);

      // Get all messages for owner's apartments
      const { data: messageData } = await supabase
        .from('messages')
        .select('*, apartments(title, image_urls)')
        .in('apartment_id', apartmentIds)
        .order('created_at', { ascending: false });

      if (messageData) {
        // Group messages by apartment_id + tenant_email
        const groupedConversations: { [key: string]: any } = {};

        messageData.forEach((msg: any) => {
          const tenantEmail = msg.sender_email === authUser.email ? msg.owner_email : msg.sender_email;
          const conversationKey = `${msg.apartment_id}::${tenantEmail}`;

          if (!groupedConversations[conversationKey]) {
            const unreadCount = messageData.filter(
              (m: any) =>
                m.apartment_id === msg.apartment_id &&
                (m.sender_email === tenantEmail) &&
                !m.read &&
                m.sender_email !== authUser.email
            ).length;

            groupedConversations[conversationKey] = {
              conversation_key: conversationKey,
              apartment_id: msg.apartment_id,
              apartment_title: msg.apartments?.title || 'Untitled',
              apartment_image: msg.apartments?.image_urls?.[0] || '',
              tenant_email: tenantEmail,
              tenant_name: tenantEmail.split('@')[0], // Simple name extraction
              last_message: msg.content,
              last_message_time: msg.created_at,
              unread_count: unreadCount,
            };
          }
        });

        setConversations(Object.values(groupedConversations));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  const loadMessages = useCallback(async (apartmentId: string, tenantEmail: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('apartment_id', apartmentId)
        .or(`sender_email.eq.${tenantEmail},owner_email.eq.${tenantEmail}`)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [supabase]);

  const markConversationAsRead = useCallback(async (apartmentId: string, tenantEmail: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('apartment_id', apartmentId)
        .eq('sender_email', tenantEmail);

      // Update conversation unread count
      const conversationKey = `${apartmentId}::${tenantEmail}`;
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversation_key === conversationKey
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [supabase]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadUserAndConversations();
  }, [loadUserAndConversations]);

  useEffect(() => {
    if (selectedConversation) {
      const [apartmentId, tenantEmail] = selectedConversation.split('::');
      loadMessages(apartmentId, tenantEmail);
      markConversationAsRead(apartmentId, tenantEmail);

      // Subscribe to new messages
      const channel = supabase
        .channel(`owner-messages:${apartmentId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `apartment_id=eq.${apartmentId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_email === tenantEmail || newMsg.sender_email === user?.email) {
              setMessages((prev) => [...prev, newMsg]);
              scrollToBottom();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation, user, loadMessages, markConversationAsRead, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const [apartmentId, tenantEmail] = selectedConversation.split('::');

      const { error } = await supabase.from('messages').insert({
        apartment_id: apartmentId,
        sender_email: user.email,
        owner_email: tenantEmail,
        content: sanitizeUserInput(newMessage.trim(), false),
        read: false,
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              Tenant Messages
              {getTotalUnreadCount() > 0 && (
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-400 text-gray-900">
                  {getTotalUnreadCount()} unread
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-1">Respond to tenant inquiries</p>
          </div>
          <Link
            href="/owner"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-96 border-r border-gray-200 overflow-y-auto bg-gray-50">
              <div className="p-4 border-b border-gray-200 bg-white">
                <h2 className="text-sm font-semibold text-gray-900">All Conversations</h2>
                <p className="text-xs text-gray-500 mt-1">{conversations.length} active chats</p>
              </div>

              {conversations.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {conversations.map((conv) => (
                    <button
                      key={conv.conversation_key}
                      onClick={() => setSelectedConversation(conv.conversation_key)}
                      className={`w-full p-4 text-left hover:bg-white transition ${selectedConversation === conv.conversation_key ? 'bg-white border-l-4 border-yellow-400' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        {conv.apartment_image && (
                          <div className="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={conv.apartment_image}
                              alt={conv.apartment_title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {conv.tenant_name}
                              </h3>
                              <p className="text-xs text-gray-500 truncate">
                                {conv.apartment_title}
                              </p>
                            </div>
                            {conv.unread_count > 0 && (
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-400 text-gray-900 flex-shrink-0">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {conv.last_message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(conv.last_message_time).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1">Tenants will appear here when they contact you</p>
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {conversations.find((c) => c.conversation_key === selectedConversation)?.tenant_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Re: {conversations.find((c) => c.conversation_key === selectedConversation)?.apartment_title}
                        </p>
                      </div>
                      <Link
                        href={`/apartments/${selectedConversation.split('::')[0]}`}
                        className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium rounded-lg transition"
                      >
                        View Listing →
                      </Link>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_email === user?.email;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-md px-4 py-2 rounded-lg ${isOwn
                              ? 'bg-yellow-400 text-gray-900'
                              : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isOwn ? 'text-gray-700' : 'text-gray-500'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], {
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
                        onChange={(e) => setNewMessage(e.target.value)}
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
                    <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-700">Select a conversation</p>
                    <p className="text-sm text-gray-500 mt-1">Choose a tenant conversation to view messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
