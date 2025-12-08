import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '@/lib/llm/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SearchGoal } from '@/components/SearchGoalCard';
import { logger } from '@/lib/logger';

// Helper to create Supabase client
const createClient = () => {
    const cookieStore = cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
            },
        }
    );
};

export async function POST(req: NextRequest) {
    try {
        const { message, previousMessages, currentGoal, sessionToken } = await req.json();
        const supabase = createClient();

        // 1. Construct Prompt for Intent Extraction
        const systemPrompt = `
You are an expert real estate agent for Student Apartments Budapest.
Your goal is to help the user find their perfect apartment by building a "Search Profile".

Current Profile State:
${JSON.stringify(currentGoal, null, 2)}

User's Last Message: "${message}"

INSTRUCTIONS:
1. Analyze the user's message.
2. Update the "Search Profile" JSON based on new information.
   - If user says "budget 150k", update budget.max to 150000.
   - If user says "near ELTE", add to location.poi_proximity.
   - If user says "balcony", add to features.must_have.
   - If user contradicts previous info, update it.
3. Generate a helpful, short, conversational response asking for missing details or confirming updates.

OUTPUT FORMAT (JSON ONLY):
{
  "updated_goal": { ...entire goal object... },
  "response_text": "Your natural language response here."
}
`;

        // 2. Call LLM
        let llmResult;
        try {
            llmResult = await ollamaClient.generateJSON<{ updated_goal: SearchGoal; response_text: string }>(
                systemPrompt,
                { temperature: 0.2 } // Low temp for stability
            );
        } catch (err) {
            logger.warn({ err }, 'LLM Generation failed, falling back to simple echo');
            // Fallback if LLM fails (e.g. offline)
            llmResult = {
                updated_goal: currentGoal,
                response_text: "I'm having trouble connecting to my AI brain right now, but I heard you. Could you repeat that?"
            };
        }

        const { updated_goal, response_text } = llmResult;

        // 3. Persist to Supabase (if we have a session)
        if (sessionToken) {
            // Ideally we'd look up the session_id by token and insert message
            // For now, we'll trust the client to handle the bulk of state or just return the computed state
            // Detailed DB persistence logic can be added here if we want server-side history authority

            // Example: Update session goal
            const { error } = await supabase
                .from('ai_search_sessions')
                .update({ current_goal: updated_goal, last_active_at: new Date().toISOString() })
                .eq('session_token', sessionToken);

            if (error) logger.error({ error }, 'Failed to update session goal');
        }

        return NextResponse.json({
            role: 'assistant',
            content: response_text,
            goal: updated_goal
        });

    } catch (error) {
        logger.error({ error }, 'Search Agent Error');
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
