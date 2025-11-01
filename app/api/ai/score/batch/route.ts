/**
 * Batch AI Scoring Endpoint
 * 
 * POST /api/ai/score/batch
 * 
 * Scores multiple apartments in a single request with:
 * - Efficient batching (max 10 per request)
 * - Circuit breaker for resilience
 * - Automatic persistence to ranking_events
 * - Cache hits for recently scored apartments
 * 
 * Request:
 * ```json
 * {
 *   "apartments": [
 *     { "id": "...", "title": "...", "price": 150000, ... },
 *     ...
 *   ],
 *   "userProfile": {
 *     "budget": 150000,
 *     "preferences": ["WiFi", "Parking"],
 *     ...
 *   }
 * }
 * ```
 * 
 * Response:
 * ```json
 * {
 *   "success": true,
 *   "results": {
 *     "successful": 10,
 *     "failed": 0,
 *     "apartments": [
 *       {
 *         "apartmentId": "...",
 *         "aiScore": 85,
 *         "reasons": ["Matches budget", "Has WiFi", ...],
 *         "success": true
 *       },
 *       ...
 *     ],
 *     "totalMs": 2500,
 *     "circuitBreakerOpen": false
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { batchScoringService } from '@/services/batch-scoring-svc';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const batchRequestSchema = z.object({
  apartments: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      price: z.number().optional(),
      location: z.string().optional(),
      amenities: z.array(z.string()).optional(),
      features: z.array(z.string()).optional(),
      rooms: z.number().optional(),
      size: z.number().optional(),
    }),
  ),
  userProfile: z.object({
    budget: z.number().optional(),
    preferences: z.array(z.string()).optional(),
    location: z.string().optional(),
    personality: z.any().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Optional: Validate user is authenticated
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // Cookie setting may fail in some scenarios
            }
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required for batch scoring' },
        { status: 401 },
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = batchRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    const { apartments, userProfile } = validation.data;

    // Validate apartment count
    if (apartments.length === 0) {
      return NextResponse.json(
        { error: 'At least one apartment required' },
        { status: 400 },
      );
    }

    if (apartments.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 apartments per request' },
        { status: 400 },
      );
    }

    console.log('[BatchScoringAPI] Scoring', apartments.length, 'apartments for user', user.id);

    // Score the batch
    const result = await batchScoringService.scoreApartmentBatch(
      apartments,
      userProfile || {},
    );

    const totalTime = Date.now() - startTime;

    // Log circuit breaker status
    const cbStatus = batchScoringService.getCircuitBreakerStatus();
    if (cbStatus.isOpen) {
      console.warn('[BatchScoringAPI] Circuit breaker is OPEN - limited availability');
    }

    return NextResponse.json({
      success: true,
      results: {
        successful: result.successful,
        failed: result.failed,
        apartments: result.results,
        totalMs: result.totalTime,
        apiTime: totalTime,
        circuitBreakerOpen: result.circuitBreakerOpen,
        circuitBreakerStatus: cbStatus,
      },
      message: `Scored ${result.successful} apartments successfully, ${result.failed} failed`,
    });
  } catch (error: any) {
    const totalTime = Date.now() - startTime;

    console.error('[BatchScoringAPI] Error:', {
      message: error?.message,
      code: error?.code,
      totalMs: totalTime,
    });

    return NextResponse.json(
      {
        error: 'Batch scoring failed',
        message: error?.message,
        results: {
          successful: 0,
          failed: 0,
          apartments: [],
          totalMs: totalTime,
          apiTime: totalTime,
          circuitBreakerOpen: batchScoringService.getCircuitBreakerStatus().isOpen,
        },
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check and status endpoint
  const cbStatus = batchScoringService.getCircuitBreakerStatus();
  const cacheStats = batchScoringService.getCacheStats();

  return NextResponse.json({
    status: 'ok',
    message: 'Batch AI Scoring API',
    usage: 'POST with { apartments, userProfile }',
    maxApartmentsPerRequest: 50,
    batchSize: 10,
    circuitBreaker: cbStatus,
    cache: cacheStats,
    endpoints: {
      score: 'POST /api/ai/score/batch',
      reset: 'POST /api/ai/score/admin/reset (admin only)',
    },
  });
}
