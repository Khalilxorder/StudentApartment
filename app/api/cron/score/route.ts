/**
 * AI Scoring Cron Job
 * 
 * Automatically scores recently viewed or interacted apartments
 * Runs periodically to generate ranking_events for bandit learning
 * 
 * Triggered by:
 * - External cron service (e.g., Vercel crons, AWS Lambda, GitHub Actions)
 * - Rate limited: 1 request per hour maximum
 * 
 * Flow:
 * 1. Find apartments with recent activity (views, messages, saves)
 * 2. Batch score them with user preferences
 * 3. Persist scores to ranking_events
 * 4. Update ranking weights via bandit algorithm
 * 
 * Security:
 * - Requires CRON_SECRET authorization header
 * - Validates each scoring operation
 * - Graceful error handling (non-blocking)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/db/pool';
import { batchScoringService } from '@/services/batch-scoring-svc';

// This should be set in environment variables and kept secret
const CRON_SECRET = process.env.CRON_SECRET || 'default-secret';

interface UserWithApartments {
  userId: string;
  apartments: Array<{
    id: string;
    title: string;
    price: number;
    location: string;
    amenities: string[];
    rooms: number;
    size: number;
  }>;
  profile: {
    budget?: number;
    preferences?: string[];
    location?: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate cron secret
    const authHeader = request.headers.get('Authorization') || '';
    const providedSecret = authHeader.replace('Bearer ', '');

    if (providedSecret !== CRON_SECRET) {
      console.warn('[ScoringCron] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Verify request is from authorized source
    const source = request.headers.get('x-cron-source') || 'unknown';
    console.log('[ScoringCron] Starting background scoring job from', source);

    // Find recently active users (viewed apartments in last 24h)
    const activeUsersResult = await runQuery<{
      user_id: string;
    }>(
      `
      SELECT DISTINCT user_id
      FROM ranking_feedback
      WHERE created_at >= NOW() - interval '24 hours'
      LIMIT 100
    `,
    );

    if (!activeUsersResult.rows || activeUsersResult.rows.length === 0) {
      console.log('[ScoringCron] No active users found');
      return NextResponse.json({
        success: true,
        message: 'No active users found',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

  const activeUserIds = activeUsersResult.rows.map(({ user_id }: { user_id: string }) => user_id);
    console.log('[ScoringCron] Found', activeUserIds.length, 'active users');

    // Process each user
    let totalScored = 0;
    let totalFailed = 0;

    for (const userId of activeUserIds) {
      try {
        // Get user's recent apartment interactions
        const apartmentsResult = await runQuery<{
          id: string;
          title: string;
          price: number;
          location: string;
          amenities: string[];
          rooms: number;
          size: number;
        }>(
          `
          SELECT DISTINCT
            a.id,
            a.title,
            a.price,
            a.location,
            a.amenities,
            a.rooms,
            a.size
          FROM apartments a
          JOIN ranking_feedback rf ON a.id = rf.apartment_id
          WHERE rf.user_id = $1
            AND rf.created_at >= NOW() - interval '7 days'
            AND NOT EXISTS (
              SELECT 1 FROM ranking_events
              WHERE apartment_id = a.id
                AND created_at >= NOW() - interval '1 hour'
            )
          ORDER BY rf.created_at DESC
          LIMIT 20
        `,
          [userId],
        );

        if (!apartmentsResult.rows || apartmentsResult.rows.length === 0) {
          continue;
        }

        // Get user profile for personalized scoring
        const profileResult = await runQuery<{
          budget: number;
          preferences: string[];
        }>(
          `
          SELECT
            (data->'preferences'->>'budget')::numeric as budget,
            data->'preferences'->>'preferences' as preferences
          FROM user_profiles
          WHERE user_id = $1
        `,
          [userId],
        );

        const userProfile = profileResult.rows?.[0] || {};
        const apartments = apartmentsResult.rows;

        console.log('[ScoringCron] Scoring', apartments.length, 'apartments for user', userId);

        // Score batch
        const result = await batchScoringService.scoreApartmentBatch(
          apartments,
          userProfile,
        );

        totalScored += result.successful;
        totalFailed += result.failed;

        console.log('[ScoringCron] User batch result:', {
          userId,
          successful: result.successful,
          failed: result.failed,
          timeMs: result.totalTime,
        });
      } catch (error: any) {
        console.error('[ScoringCron] Error processing user', userId, error.message);
        totalFailed += 1;
      }
    }

    const totalTime = Date.now() - startTime;

    console.log('[ScoringCron] Job complete:', {
      totalScored,
      totalFailed,
      duration: totalTime,
      usersProcessed: activeUserIds.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Background scoring completed',
      summary: {
        usersProcessed: activeUserIds.length,
        apartmentsScored: totalScored,
        apartmentsFailed: totalFailed,
        duration: totalTime,
      },
    });
  } catch (error: any) {
    console.error('[ScoringCron] Job failed:', error.message);

    return NextResponse.json(
      {
        error: 'Background scoring job failed',
        message: error?.message,
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check for cron endpoint
  const cbStatus = batchScoringService.getCircuitBreakerStatus();

  return NextResponse.json({
    status: cbStatus.isOpen ? 'degraded' : 'ok',
    message: 'AI Scoring Background Job (Cron)',
    schedule: 'Runs hourly by default',
    circuitBreaker: cbStatus,
    usage: 'POST with Authorization: Bearer <CRON_SECRET>',
  });
}
