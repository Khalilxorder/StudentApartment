import { useState, useCallback } from 'react';
import { Message } from '@/components/chat-search/types';
import { SearchGoal } from '@/components/SearchGoalCard';

export function useSearchAgent() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', from: 'ai', text: 'Hi! I can help you find an apartment. Tell me about what you are looking for (budget, location, etc.)!' }
    ]);

    const [goal, setGoal] = useState<SearchGoal>({
        budget: { currency: 'HUF' },
        location: { districts: [] },
        features: { must_have: [], nice_to_have: [] },
        occupancy: { type: 'student', count: 1 },
        status: 'exploring'
    });

    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        // 1. Add user message immediately
        const userMsg: Message = {
            id: Date.now().toString(),
            from: 'user',
            text
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // 2. Call API
            const res = await fetch('/api/ai/search-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    previousMessages: messages.slice(-5), // Send last 5 context
                    currentGoal: goal,
                    sessionToken: localStorage.getItem('search_session_token') || 'demo'
                })
            });

            if (!res.ok) throw new Error('Agent failed');

            const data = await res.json();

            // 3. Update state with AI response
            if (data.goal) {
                setGoal(data.goal);
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                from: 'ai',
                text: data.content
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (err) {
            console.error('Agent error:', err);
            // Fallback error message
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                from: 'system',
                text: 'Sorry, I had trouble processing that. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        goal,
        isLoading,
        sendMessage,
        setMessages // Exposed for clearing/initialization if needed
    };
}
