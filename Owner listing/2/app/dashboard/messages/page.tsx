'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabaseClient';
import { sanitizeUserInput } from '@/lib/sanitize';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfilePopup from '@/components/ProfilePopup';

interface Conversation {
  apartment_id: string;
  apartment_title: string;
  apartment_image: string;
  owner_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_typing?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_email: string;
  created_at: string;
  read: boolean;
}

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [profilePopup, setProfilePopup] = useState<{
    isOpen: boolean;
    user: any;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    user: null,
    position: { x: 0, y: 0 },
  });

  useEffect(() => {
    loadUserAndConversations();
  }, []);

  useEffect(() => {
    if (selectedApartmentId) {
      loadMessages(selectedApartmentId);
      markConversationAsRead(selectedApartmentId);
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`messages:${selectedApartmentId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `apartment_id=eq.${selectedApartmentId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedApartmentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserAndConversations = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      
      setUser(authUser);

      // Get all conversations grouped by apartment
      const { data: messageData } = await supabase
        .from('messages')
        .select('*, apartments(title, image_urls, owner_email)')
        .or(`sender_email.eq.${authUser.email},owner_email.eq.${authUser.email}`)
        .order('created_at', { ascending: false });

      if (messageData) {
        // Group messages by apartment_id
        const groupedConversations: { [key: string]: any } = {};
        
        messageData.forEach((msg: any) => {
          if (!groupedConversations[msg.apartment_id]) {
            const unreadCount = messageData.filter(
              (m: any) =>
                m.apartment_id === msg.apartment_id &&
                !m.read &&
                m.sender_email !== authUser.email
            ).length;

            groupedConversations[msg.apartment_id] = {
              apartment_id: msg.apartment_id,
              apartment_title: msg.apartments?.title || 'Untitled',
              apartment_image: msg.apartments?.image_urls?.[0] || '',
              owner_name: msg.owner_email,
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
  };

  const loadMessages = async (apartmentId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('apartment_id', apartmentId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleProfileClick = (userEmail: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setProfilePopup({
      isOpen: true,
      user: {
        email: userEmail,
        name: conversations.find(c => c.apartment_id === selectedApartmentId)?.owner_name,
      },
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      },
    });
  };

  const closeProfilePopup = () => {
    setProfilePopup(prev => ({ ...prev, isOpen: false }));
  };

  const markConversationAsRead = async (apartmentId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('apartment_id', apartmentId)
        .neq('sender_email', user.email);

      // Update conversation unread count
      setConversations((prev) =>
        prev.map((conv) =>
          conv.apartment_id === apartmentId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedApartmentId || !user) return;

    setSending(true);
    try {
      const conversation = conversations.find((c) => c.apartment_id === selectedApartmentId);
      
      const { error } = await supabase.from('messages').insert({
        apartment_id: selectedApartmentId,
        sender_email: user.email,
        owner_email: conversation?.owner_name || '',
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
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">Chat with apartment owners</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-gray-200 overflow-y-auto bg-gray-50">
              <div className="p-4 border-b border-gray-200 bg-white">
                <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
              </div>
              
              {conversations.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {conversations.map((conv) => (
                    <button
                      key={conv.apartment_id}
                      onClick={() => setSelectedApartmentId(conv.apartment_id)}
                      className={`w-full p-4 text-left hover:bg-white transition ${
                        selectedApartmentId === conv.apartment_id ? 'bg-white border-l-4 border-yellow-400' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {conv.apartment_image && (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={conv.apartment_image}
                              alt={conv.apartment_title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {conv.apartment_title}
                            </h3>
                            {conv.unread_count > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-gray-900">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {conv.last_message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(conv.last_message_time).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {conv.is_typing && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600">
                          <span className="animate-pulse">●</span>
                          <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                          <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                          <span className="ml-1">typing...</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm">No conversations yet</p>
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedApartmentId ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {conversations.find((c) => c.apartment_id === selectedApartmentId)?.apartment_title}
                        </h3>
                        <button
                          onClick={(e) => handleProfileClick(
                            conversations.find((c) => c.apartment_id === selectedApartmentId)?.owner_name || '',
                            e
                          )}
                          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          {conversations.find((c) => c.apartment_id === selectedApartmentId)?.owner_name}
                        </button>
                      </div>
                      <Link
                        href={`/apartments/${selectedApartmentId}`}
                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
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
                            className={`max-w-md px-4 py-2 rounded-lg ${
                              isOwn
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
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
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
                    <p className="text-sm text-gray-500 mt-1">Choose a conversation from the list to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Popup */}
      <ProfilePopup
        user={profilePopup.user}
        isOpen={profilePopup.isOpen}
        onClose={closeProfilePopup}
        position={profilePopup.position}
      />
    </div>
  );
}
