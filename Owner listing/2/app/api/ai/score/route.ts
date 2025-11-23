import { NextRequest, NextResponse } from 'next/server';
import { calculateSuitabilityScore } from '@/utils/gemini';
import { z } from 'zod';

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

    console.log('🤖 Server: Scoring apartment with Gemini AI...', apartment.id);
    const result = await calculateSuitabilityScore(apartment, userPreferences || {}, personality);
    console.log('✅ Server: Score calculated:', result.score);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('❌ Server: Gemini scoring error:', error);
    // Retry once on failure
    try {
      console.log('🔄 Retrying Gemini scoring...');
      const body = await request.json();
      const validation = scoreRequestSchema.safeParse(body);
      if (validation.success) {
        const { apartment, userPreferences, personality } = validation.data;
        const result = await calculateSuitabilityScore(apartment, userPreferences || {}, personality);
        return NextResponse.json({ success: true, result });
      }
    } catch (retryError: any) {
      console.error('❌ Retry failed:', retryError);
    }

    return NextResponse.json(
      { error: 'AI scoring failed after retry', details: error.message },
      { status: 500 }
    );
  }
}
