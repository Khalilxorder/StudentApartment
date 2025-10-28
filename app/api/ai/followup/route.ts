import { NextRequest, NextResponse } from 'next/server';
import { generateFollowUpQuestions } from '@/utils/gemini';

// This runs on the server, so API key is safe
export async function POST(request: NextRequest) {
  try {
    const { story, preferences, askedQuestions } = await request.json();

    if (!story) {
      return NextResponse.json(
        { error: 'Story is required' },
        { status: 400 }
      );
    }

    console.log('🤖 Server: Generating follow-up questions...');
    const questions = await generateFollowUpQuestions(story, preferences, askedQuestions);
    console.log('✅ Server: Generated', questions.length, 'questions');

    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    console.error('❌ Server: Follow-up questions error:', error);
    // Retry once
    try {
      console.log('🔄 Retrying follow-up generation...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { story, preferences, askedQuestions } = await request.json();
      const questions = await generateFollowUpQuestions(story, preferences, askedQuestions);
      return NextResponse.json({ success: true, questions });
    } catch (retryError: any) {
      console.error('❌ Retry failed:', retryError);
      return NextResponse.json(
        { error: 'Question generation failed after retry', details: retryError.message },
        { status: 500 }
      );
    }
  }
}
