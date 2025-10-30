import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, traits, archetype } = await request.json();

    // Validate required fields
    if (!userId || !traits) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In production, save to Supabase
    // const { error } = await supabase
    //   .from('personality_assessments')
    //   .upsert({
    //     user_id: userId,
    //     traits: traits,
    //     archetype: archetype,
    //     created_at: new Date().toISOString(),
    //     updated_at: new Date().toISOString()
    //   });

    // For demo, we'll just return success
    // In a real implementation, this would store the assessment data

    return NextResponse.json({
      success: true,
      message: 'Personality assessment saved successfully'
    });
  } catch (error) {
    console.error('Personality assessment callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests for OAuth callback if needed
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user');
  const code = searchParams.get('code');

  if (!userId || !code) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // In production, exchange code for assessment data from external service
  // For demo, redirect back to profile page
  return NextResponse.redirect(new URL('/dashboard/profile', request.url));
}