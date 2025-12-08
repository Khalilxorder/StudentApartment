import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { runQuery } from '@/lib/db/pool';
import { logger } from '@/lib/logger';

const feedbackSchema = z.object({
  apartmentId: z.string().uuid(),
  helpful: z.boolean(),
  origin: z.enum(['structured', 'semantic', 'ai-scored', 'keyword', 'fallback']),
  score: z.number().min(0).max(100).optional(),
  query: z.string().min(1).max(2000).optional(),
  components: z
    .object({
      origin: z.string().optional(),
      displayedScore: z.number().optional(),
      aiScore: z.number().nullable().optional(),
      featureMatchScore: z.number().nullable().optional(),
      semanticScore: z.number().nullable().optional(),
    })
    .partial()
    .optional(),
  reasons: z.array(z.string().max(280)).max(10).optional(),
  aiReasons: z.array(z.string().max(280)).max(10).optional(),
});

export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();

  try {
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid feedback payload',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration incomplete' },
        { status: 500 },
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch (error) {
            logger.warn({ error }, 'Unable to persist auth cookies');
          }
        },
      },
    });

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;

    const normalizedScore = Math.max(0, Math.min(1, ((payload.score ?? 50) / 100)));
    const rankingScore = payload.helpful ? normalizedScore : Math.max(0, normalizedScore * 0.25);

    const componentScores = {
      ...(payload.components ?? {}),
      origin: payload.origin,
      helpful: payload.helpful ? 1 : 0,
      displayedScore: payload.score ?? null,
      aiScore: payload.components?.aiScore ?? null,
      featureMatchScore: payload.components?.featureMatchScore ?? null,
      semanticScore: payload.components?.semanticScore ?? null,
      queryLength: payload.query?.length ?? 0,
      aiReasons: payload.aiReasons ?? [],
    };

    const reasons = new Set<string>();
    (payload.reasons ?? []).forEach((reason) => {
      if (reason.trim()) {
        reasons.add(reason.trim().slice(0, 280));
      }
    });
    (payload.aiReasons ?? []).forEach((reason) => {
      if (reason.trim()) {
        reasons.add(reason.trim().slice(0, 280));
      }
    });
    reasons.add(payload.helpful ? 'feedback_helpful' : 'feedback_unhelpful');

    await runQuery(
      `
        INSERT INTO public.ranking_events (
          user_id,
          apartment_id,
          experiment_id,
          variant_id,
          ranking_score,
          component_scores,
          reasons
        ) VALUES (
          $1::uuid,
          $2::uuid,
          $3::text,
          $4::text,
          $5::numeric,
          $6::jsonb,
          $7::text[]
        )
      `,
      [
        userId,
        payload.apartmentId,
        'why_this_modal_feedback',
        payload.helpful ? 'marked_helpful' : 'marked_unhelpful',
        rankingScore.toFixed(4),
        JSON.stringify(componentScores),
        Array.from(reasons).slice(0, 10),
      ],
    );

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - requestStartedAt,
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error }, 'Failed to record feedback');
    return NextResponse.json(
      {
        error: 'Failed to record feedback',
        message: error?.message ?? 'Unknown error',
      },
      { status: 500 },
    );
  }
}
