import { NextRequest, NextResponse } from 'next/server';
import { generateFollowUpQuestions } from '@/utils/gemini';

/**
 * Follow-up Questions Generation API
 * 
 * Improvements:
 * - Parse JSON once, pass through retry
 * - Circuit breaker + timeout protection
 * - Structured error codes
 * - Observability metrics
 */

export const runtime = 'nodejs';

interface FollowUpRequest {
  story: string;
  preferences?: Record<string, any>;
  askedQuestions?: string[];
}

class FollowUpError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FollowUpError';
  }
}

// This runs on the server, so API key is safe
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let parsedBody: FollowUpRequest | null = null;

  try {
    // Parse JSON once, reuse for retries
    const rawBody = await request.json();
    parsedBody = rawBody && typeof rawBody === 'object' ? (rawBody as FollowUpRequest) : null;

    if (!parsedBody) {
      throw new FollowUpError('INVALID_INPUT', 'Request body must be a JSON object');
    }

    const { story, preferences, askedQuestions } = parsedBody;

    if (!story || typeof story !== 'string') {
      throw new FollowUpError('INVALID_INPUT', 'Story is required and must be a string');
    }

    console.log('[FollowUp] 🤖 Generating follow-up questions with timeout protection...');
    const questions = await generateFollowUpQuestions(story, preferences, askedQuestions);
    console.log('[FollowUp] ✅ Generated', questions.length, 'questions');

    const metrics = {
      generation_ms: Date.now() - startTime,
      question_count: questions.length,
    };

    return NextResponse.json({
      success: true,
      questions,
      metrics,
    });

  } catch (error: any) {
    const errorCode = error?.code || getErrorCode(error);
    const errorMsg = error?.message || String(error);
    const totalMs = Date.now() - startTime;

    console.error('[FollowUp] ❌ Error:', {
      code: errorCode,
      message: errorMsg,
      totalMs,
    });

    // Retry once on transient errors, but reuse parsed body
    if (
      parsedBody &&
      (errorCode === 'AI_TIMEOUT' || errorCode === 'AI_UNAVAILABLE') &&
      totalMs < 5000 // Only retry if quick failure
    ) {
      console.log('[FollowUp] 🔄 Retrying after transient error...');
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
  const { story, preferences, askedQuestions } = parsedBody;
        const questions = await generateFollowUpQuestions(story, preferences, askedQuestions);
        
        return NextResponse.json({
          success: true,
          questions,
          metrics: { retried: true, total_ms: Date.now() - startTime },
        });
      } catch (retryError: any) {
        console.error('[FollowUp] ❌ Retry failed:', retryError?.message);
        // Fall through to error response below
      }
    }

    return NextResponse.json(
      {
        error: 'Question generation failed',
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
        fallback: true, // Signal client to show fallback UI
        metrics: { total_ms: totalMs },
      },
      { status: 500 }
    );
  }
}

/**
 * Normalize error to structured code
 */
function getErrorCode(error: any): string {
  const message = error?.message || String(error);
  
  if (message.includes('[AI_TIMEOUT]') || message.includes('timed out')) {
    return 'AI_TIMEOUT';
  }
  if (message.includes('circuit') || message.includes('OPEN')) {
    return 'AI_CIRCUIT_OPEN';
  }
  if (message.includes('API key') || message.includes('GOOGLE_AI_API_KEY')) {
    return 'AI_AUTH_ERROR';
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return 'AI_RATE_LIMIT';
  }
  if (message.includes('INVALID_INPUT')) {
    return 'INVALID_INPUT';
  }
  if (message.includes('ECONNREFUSED') || message.includes('UNAVAILABLE')) {
    return 'AI_UNAVAILABLE';
  }
  
  return 'AI_UNKNOWN_ERROR';
}
