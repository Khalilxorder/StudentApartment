import { NextRequest, NextResponse } from 'next/server';
import { analyzeUserStory } from '@/utils/gemini';
import { logger } from '@/lib/logger';

// Mock fallback for demo when API is unavailable
const generateMockAnalysis = (story: string) => {
  const keywords = story.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWords = [...new Set(keywords)].slice(0, 5);

  return {
    summary: `Story analysis: "${story.substring(0, 50)}..."`,
    keywords: uniqueWords,
    sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
    relevance_score: Math.random() * 0.5 + 0.5,
    // This is a fallback mock response
  };
};

// This runs on the server, so API key is safe
export async function POST(request: NextRequest) {
  try {
    // Clone the request to read body
    const body = await request.text();
    logger.debug({ bodyLength: body.length }, '📥 Received request body');

    if (!body) {
      return NextResponse.json(
        { error: 'Request body is empty' },
        { status: 400 }
      );
    }

    const { story } = JSON.parse(body);

    if (!story || typeof story !== 'string') {
      return NextResponse.json(
        { error: 'Story is required and must be a string' },
        { status: 400 }
      );
    }

    logger.info(' Server: Analyzing story with Gemini AI');
    try {
      const analysis = await analyzeUserStory(story);
      logger.info('✅ Server: Gemini analysis complete');
      return NextResponse.json({ success: true, analysis });
    } catch (apiError: any) {
      logger.warn('⚠️ Gemini API unavailable, using fallback mock analysis');
      // Fallback to mock analysis when API quota is exceeded
      const mockAnalysis = generateMockAnalysis(story);
      return NextResponse.json({
        success: true,
        analysis: mockAnalysis,
        fallback: true,
        note: 'This is a mock response - API quota exceeded'
      });
    }
  } catch (error: any) {
    logger.error({ err: error }, '❌ Server: Request processing error');
    return NextResponse.json(
      { error: 'Request processing failed', details: error.message },
      { status: 500 }
    );
  }
}


