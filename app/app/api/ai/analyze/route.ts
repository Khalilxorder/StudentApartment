import { NextRequest, NextResponse } from 'next/server';
import { analyzeUserStory } from '@/utils/gemini';

// This runs on the server, so API key is safe
export async function POST(request: NextRequest) {
  try {
    const { story } = await request.json();

    if (!story || typeof story !== 'string') {
      return NextResponse.json(
        { error: 'Story is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('🤖 Server: Analyzing story with Gemini AI...');
    const analysis = await analyzeUserStory(story);
    console.log('✅ Server: Gemini analysis complete');

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('❌ Server: Gemini API error:', error);
    return NextResponse.json(
      { error: 'AI analysis failed', details: error.message },
      { status: 500 }
    );
  }
}


