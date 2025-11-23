'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { sanitizeUserInput } from '@/lib/sanitize';
import { supabase } from '@/utils/supabaseClient';

interface Message {
    id: string;
    content: string;
    created_at: string;
    read: boolean;
    sender_id: string;
    receiver_id: string;
    sender?: {
        first_name: string;
        last_name: string;
    };
}

interface ChatBoxProps {
    apartmentId: string;
    apartmentTitle: string;
    ownerId?: string;
    onClose: () => void;
    currentUserEmail?: string;
}

export default function ChatBox({
    apartmentId,
    apartmentTitle,
    ownerId,
    onClose,
    currentUserEmail,
}: ChatBoxProps) {
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Fetch messages using the API
    const fetchMessages = useCallback(async () => {
        if (!ownerId) return;

        try {
            // Fetch all conversations to find the one for this apartment
            const response = await fetch('/api/messages');
            if (!response.ok) {
                console.error('Failed to fetch messages');
                return;
            }

            const data = await response.json();
            // Find the conversation for this apartment
            const conversation = data.conversations?.find(
                (conv: any) => conv.apartment && conv.apartment.id === apartmentId
            );

            if (conversation?.messages) {
                setMessages(conversation.messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }, [apartmentId, ownerId]);

    // Initialize current user
    useEffect(() => {
        const initialize = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }
        };

        initialize();
    }, []);

    // Fetch messages when component mounts
    useEffect(() => {
        if (currentUserId && ownerId) {
            fetchMessages();
        }
    }, [currentUserId, ownerId, fetchMessages]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Real-time subscription for new messages
    useEffect(() => {
        if (!currentUserId || !ownerId) return;

        const channel = supabase
            .channel('chatbox-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=eq.${currentUserId}`
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${currentUserId}`
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, ownerId]);

    const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log('Sending message via API...', { newMessage, currentUserId, ownerId });
        if (!newMessage.trim() || !currentUserId || !ownerId) {
            return;
        }

        const sanitized = sanitizeUserInput(newMessage.trim());
        if (!sanitized) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apartmentId,
                    receiverId: ownerId,
                    content: sanitized,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send message');
            }

            setNewMessage('');
            // Real-time subscription will add the message automatically
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!currentUserEmail) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Login Required</h3>
                    <p className="text-gray-600 mb-6">Please log in to chat with the apartment owner.</p>
                    <div className="flex gap-3">
                        <a
                            href="/login"
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg text-center transition"
                        >
                            Login
                        </a>
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Chat about: {apartmentTitle}</h3>
                        <p className="text-sm text-gray-500">Speak directly with the owner</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition p-2"
                        aria-label="Close chat"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                            </svg>
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map(message => {
                            const isOwnMessage = message.sender_id === currentUserId;
                            const senderName = message.sender
                                ? `${message.sender.first_name} ${message.sender.last_name}`
                                : isOwnMessage ? 'You' : 'Owner';

                            return (
                                <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwnMessage
                                            ? 'bg-orange-600 text-white rounded-br-none'
                                            : 'bg-gray-200 text-gray-900 rounded-bl-none'
                                            }`}
                                    >
                                        {!isOwnMessage && (
                                            <p className="text-xs font-semibold mb-1 opacity-70">
                                                {senderName}
                                            </p>
                                        )}
                                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                        <p className={`text-xs mt-1 ${isOwnMessage ? 'text-orange-100' : 'text-gray-500'}`}>
                                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={event => setNewMessage(event.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !newMessage.trim()}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
