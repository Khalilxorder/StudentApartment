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
    // Retry once after a short delay
    try {
      console.log('🔄 Retrying Gemini analysis...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const analysis = await analyzeUserStory(await request.json().then(data => data.story));
      return NextResponse.json({ success: true, analysis });
    } catch (retryError: any) {
      console.error('❌ Retry failed:', retryError);
      return NextResponse.json(
        { error: 'AI analysis failed after retry', details: retryError.message },
        { status: 500 }
      );
    }
  }
}
