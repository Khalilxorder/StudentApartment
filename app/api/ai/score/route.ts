import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Lazy load Gemini module
let calculateSuitabilityScore: any = null;

async function getScoreFunction() {
  if (!calculateSuitabilityScore) {
    try {
      const gemini = await import('@/utils/gemini');
      calculateSuitabilityScore = gemini.calculateSuitabilityScore;
    } catch (err) {
      console.error('Failed to load Gemini module:', err);
      throw err;
    }
  }
  return calculateSuitabilityScore;
}

// Validation schema for AI scoring request
const scoreRequestSchema = z.object({
  apartment: z.object({
    id: z.string(),
    title: z.string(),
    price: z.number().optional(),
    location: z.string().optional(),
    features: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
    size: z.number().optional(),
    rooms: z.number().optional(),
  }),
  userPreferences: z.object({
    budget: z.number().optional(),
    location: z.string().optional(),
    preferences: z.array(z.string()).optional(),
    priorities: z.array(z.string()).optional(),
  }).optional(),
  personality: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = scoreRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { apartment, userPreferences, personality } = validation.data;

    if (!apartment) {
      return NextResponse.json(
        { error: 'Apartment data is required' },
        { status: 400 }
      );
    }

    console.log('🤖 Server: Scoring apartment with Gemini 2.5-flash-lite...', apartment.id);
    const scoreFunction = await getScoreFunction();
    const result = await scoreFunction(apartment, userPreferences || {}, personality);
    console.log('✅ Server: Score calculated:', result.score);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('❌ Server: Gemini scoring error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Unknown Gemini failure';
    const status = message.includes('GOOGLE_AI_API_KEY')
      ? 503
      : message.includes('All Gemini models exhausted')
        ? 502
        : 500;
    return NextResponse.json(
      { error: 'AI scoring failed', details: message },
      { status }
    );
  }
}


