import { NextRequest, NextResponse } from 'next/server';
import { analyzeUserStory } from '@/utils/gemini';

// This runs on the server, so API key is safe
export async function POST(request: NextRequest) {
  try {
    // Clone the request to read body
    const body = await request.text();
    console.log('📥 Received request body:', body || '(empty)');
    
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


