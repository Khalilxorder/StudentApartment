import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/utils/supabaseClient';
import { rankingService } from '@/services/ranking-svc';
import { runQuery } from '@/lib/db/pool';
import { logger } from '@/lib/logger';

const BANDIT_COMPONENTS = [
  'constraintFit',
  'personalFit',
  'accessibility',
  'trustQuality',
  'marketValue',
  'engagement',
] as const;

type BanditComponent = (typeof BANDIT_COMPONENTS)[number];

const DEFAULT_BANDIT_WEIGHTS: Record<BanditComponent, number> = {
  constraintFit: 0.3,
  personalFit: 0.2,
  accessibility: 0.1,
  trustQuality: 0.15,
  marketValue: 0.15,
  engagement: 0.1,
};

const feedbackSchema = z.object({
  apartmentId: z.string().uuid(),
  userId: z.string().uuid(),
  feedback: z.enum(['good', 'bad', 'neutral', 'saved', 'contacted']),
  searchSessionId: z.string().optional(),
  searchQuery: z.string().optional(),
  searchFilters: z.record(z.string(), z.unknown()).optional(),
  apartmentPosition: z.number().optional(),
  apartmentScore: z.number().optional(),
  responseTimeMs: z.number().optional(),
});

type ComponentScores = Record<BanditComponent, number>;

const MIN_TRIAL_INCREMENT = 0.05;

export async function POST(request: NextRequest) {
  try {
    // Use service client for writes
    const supabase = createServiceClient();
    const body = await request.json();
    const validatedData = feedbackSchema.parse(body);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id !== validatedData.userId) {
      return NextResponse.json(
        { error: 'Cannot provide feedback for another user' },
        { status: 403 },
      );
    }

    const feedbackScore = {
      good: 1,
      bad: -1,
      neutral: 0,
      saved: 0.5,
      contacted: 1,
    }[validatedData.feedback];

    const { data: apartmentData, error: apartmentError } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', validatedData.apartmentId)
      .single();

    if (apartmentError || !apartmentData) {
      return NextResponse.json({ error: 'Apartment not found' }, { status: 404 });
    }

    const componentScores = calculateComponentScores(
      apartmentData,
      feedbackScore,
      validatedData.searchFilters,
    );

    const { error: insertError } = await supabase.from('ranking_feedback').insert({
      user_id: validatedData.userId,
      apartment_id: validatedData.apartmentId,
      search_session_id: validatedData.searchSessionId,
      feedback_type: validatedData.feedback,
      feedback_score: feedbackScore,
      search_query: validatedData.searchQuery,
      search_filters: validatedData.searchFilters ?? {},
      apartment_position: validatedData.apartmentPosition,
      apartment_score: validatedData.apartmentScore,
      response_time_ms: validatedData.responseTimeMs,
      constraint_weight: componentScores.constraintFit,
      personal_weight: componentScores.personalFit,
      accessibility_weight: componentScores.accessibility,
      trust_weight: componentScores.trustQuality,
      market_weight: componentScores.marketValue,
      engagement_weight: componentScores.engagement,
      user_agent: request.headers.get('user-agent'),
      ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    });

    if (insertError) {
      logger.error({ insertError, apartmentId: validatedData.apartmentId }, 'Feedback insert error');
      return NextResponse.json(
        { error: 'Failed to store feedback' },
        { status: 500 },
      );
    }

    await updateBanditWeights(componentScores, feedbackScore);

    // Invalidate cached weights so new rankings reflect updated preferences
    rankingService.invalidateWeightCache();

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded and ranking weights updated',
      componentScores,
    });
  } catch (error) {
    logger.error({ error }, 'Feedback API error');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

function calculateComponentScores(
  apartmentData: Record<string, any>,
  feedbackScore: number,
  searchFilters?: Record<string, unknown>,
): ComponentScores {
  const filters = searchFilters ?? {};
  const normalizedFeedback = clamp01((feedbackScore + 1) / 2);

  const rent = toNumber(apartmentData.monthly_rent_huf);
  const roomCount = toNumber(apartmentData.room_count);
  const furnished = Boolean(apartmentData.furnished);

  let constraintChecks = 0;
  let constraintMatches = 0;

  if (typeof filters.priceMin === 'number') {
    constraintChecks += 1;
    if (rent >= (filters.priceMin as number)) constraintMatches += 1;
  }

  if (typeof filters.priceMax === 'number') {
    constraintChecks += 1;
    if (rent <= (filters.priceMax as number)) constraintMatches += 1;
  }

  if (typeof filters.bedrooms === 'number') {
    constraintChecks += 1;
    if (roomCount >= (filters.bedrooms as number)) constraintMatches += 1;
  }

  if (typeof filters.furnished === 'boolean') {
    constraintChecks += 1;
    if (furnished === filters.furnished) constraintMatches += 1;
  }

  if (typeof filters.university === 'string') {
    constraintChecks += 1;
    const commuteMinutes = extractCommuteMinutes(apartmentData.commute_cache, filters.university as string);
    if (commuteMinutes !== null && typeof filters.maxCommuteMinutes === 'number') {
      const max = Math.max(filters.maxCommuteMinutes as number, 1);
      const commuteScore = clamp01(1 - Math.max(commuteMinutes - max, 0) / max);
      constraintMatches += commuteScore;
    } else {
      constraintMatches += 0.5;
    }
  }

  if (Array.isArray(filters.amenities) && (filters.amenities as unknown[]).length > 0) {
    constraintChecks += 1;
    constraintMatches += 0.5; // Without the join data assume partial satisfaction
  }

  const constraintFit = constraintChecks
    ? clamp01(constraintMatches / constraintChecks)
    : 0.5;

  const elevatorScore = apartmentData.elevator ? 0.8 : 0.4;
  const floor = typeof apartmentData.floor === 'number' ? apartmentData.floor : null;
  const floorScore = floor !== null ? clamp01(1 - Math.min(Math.max(floor, 0), 10) / 10) : 0.5;
  const commuteScore = (() => {
    if (typeof filters.maxCommuteMinutes !== 'number') return 0.5;
    const minutes = extractCommuteMinutes(apartmentData.commute_cache, filters.university as string | undefined);
    if (minutes === null) return 0.5;
    const max = Math.max(filters.maxCommuteMinutes as number, 1);
    return clamp01(1 - Math.max(minutes - max, 0) / max);
  })();
  const accessibility = clamp01(elevatorScore * 0.4 + floorScore * 0.3 + commuteScore * 0.3);

  const verifiedScore = apartmentData.verified_owner_id ? 0.85 : 0.5;
  const mediaScore = clamp01(toNumber(apartmentData.media_quality_score, 0.6));
  const completenessScore = clamp01(toNumber(apartmentData.completeness_score, 0.6));
  const trustQuality = clamp01(
    verifiedScore * 0.4 + mediaScore * 0.3 + completenessScore * 0.3,
  );

  const marketValue = (() => {
    const priceMin = typeof filters.priceMin === 'number' ? (filters.priceMin as number) : null;
    const priceMax = typeof filters.priceMax === 'number' ? (filters.priceMax as number) : null;
    if (priceMin !== null && priceMax !== null && priceMax > priceMin) {
      const midpoint = (priceMin + priceMax) / 2;
      const delta = Math.abs(rent - midpoint) / Math.max(midpoint, 1);
      return clamp01(1 - delta);
    }
    if (typeof apartmentData.market_value_score === 'number') {
      return clamp01(apartmentData.market_value_score);
    }
    return clamp01(0.4 + normalizedFeedback * 0.4);
  })();

  const engagement = clamp01(0.5 + feedbackScore * 0.25);

  return {
    constraintFit,
    personalFit: clamp01(0.4 * constraintFit + 0.6 * normalizedFeedback),
    accessibility,
    trustQuality,
    marketValue,
    engagement,
  };
}

async function updateBanditWeights(componentScores: ComponentScores, feedbackScore: number) {
  await runQuery('INSERT INTO rank_bandit_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;');

  const { rows } = await runQuery<{
    weights: Record<string, number> | null;
    trials: Record<string, number> | null;
    successes: Record<string, number> | null;
  }>('SELECT weights, trials, successes FROM rank_bandit_state WHERE id = 1');

  const current = rows?.[0] ?? { weights: null, trials: null, successes: null };

  const trials: Record<string, number> = { ...(current.trials ?? {}) };
  const successes: Record<string, number> = { ...(current.successes ?? {}) };

  for (const key of BANDIT_COMPONENTS) {
    const contribution = clamp01(componentScores[key] ?? 0.5);
    const signalStrength = Math.max(Math.abs(feedbackScore), 0.1);
    const trialIncrement = Math.max(contribution * signalStrength, MIN_TRIAL_INCREMENT);

    const successIncrement =
      feedbackScore > 0
        ? trialIncrement
        : feedbackScore === 0
          ? trialIncrement * 0.5
          : trialIncrement * 0.1;

    const currentTrials = typeof trials[key] === 'number' ? trials[key] : 0;
    const currentSuccesses = typeof successes[key] === 'number' ? successes[key] : 0;

    trials[key] = currentTrials + trialIncrement;
    successes[key] = Math.min(trials[key], currentSuccesses + successIncrement);
  }

  const sampled: Record<string, number> = {};
  let totalSample = 0;

  for (const key of BANDIT_COMPONENTS) {
    const successCount = Math.max(0, successes[key] ?? 0);
    const trialCount = Math.max(successCount, trials[key] ?? 0);
    const alpha = successCount + 1;
    const beta = Math.max(trialCount - successCount, 0) + 1;
    const sample = sampleBeta(alpha, beta);
    sampled[key] = sample;
    totalSample += sample;
  }

  const newWeights =
    totalSample > 0
      ? Object.fromEntries(
        BANDIT_COMPONENTS.map((key) => [
          key,
          Number((sampled[key] / totalSample).toFixed(4)),
        ]),
      )
      : { ...DEFAULT_BANDIT_WEIGHTS };

  await runQuery(
    `
      UPDATE rank_bandit_state
      SET weights = $1::jsonb,
          trials = $2::jsonb,
          successes = $3::jsonb,
          last_updated = NOW()
      WHERE id = 1
    `,
    [JSON.stringify(newWeights), JSON.stringify(trials), JSON.stringify(successes)],
  );

  rankingService.invalidateWeightCache();
}

export async function GET() {
  return NextResponse.json({
    message: 'Ranking Feedback API',
    usage: 'POST with { apartmentId, userId, feedback, searchSessionId }',
    feedback_types: ['good', 'bad', 'neutral', 'saved', 'contacted'],
  });
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
}

function extractCommuteMinutes(cache: unknown, targetUniversity?: string): number | null {
  if (!cache) return null;
  let data: any;
  if (typeof cache === 'string') {
    try {
      data = JSON.parse(cache);
    } catch {
      return null;
    }
  } else {
    data = cache;
  }

  if (!data || typeof data !== 'object') return null;

  const universities = targetUniversity ? [targetUniversity] : Object.keys(data);
  let best: number | null = null;

  for (const university of universities) {
    const entry = data[university];
    if (!entry || typeof entry !== 'object') continue;

    for (const modeValues of Object.values(entry) as Array<{ minutes?: number; travelMinutes?: number; travel_minutes?: number } | null>) {
      if (!modeValues) continue;
      const minutes = toNumber(modeValues.minutes ?? modeValues.travelMinutes ?? modeValues.travel_minutes, NaN);
      if (!Number.isFinite(minutes)) continue;
      if (best === null || minutes < best) {
        best = minutes;
      }
    }
  }

  return best;
}

function sampleBeta(alpha: number, beta: number): number {
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

function sampleGamma(shape: number): number {
  const k = Math.max(shape, 1e-3);

  if (k < 1) {
    const u = Math.random();
    return sampleGamma(k + 1) * Math.pow(u, 1 / k);
  }

  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x = randomNormal();
    let v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;

    const u = Math.random();
    if (u < 1 - 0.0331 * (x ** 4)) {
      return d * v;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
