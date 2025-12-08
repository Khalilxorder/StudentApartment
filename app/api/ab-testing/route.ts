import { logger } from '@/lib/dev-logger';

// A/B Testing API for Student Apartments
// Handles experiment management and user assignment
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { abTestingService } from '@/services/ab-test-svc';
import { z } from 'zod';

// Create experiment schema
const createExperimentSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    weight: z.number().min(0).max(100),
    config: z.record(z.string(), z.any()),
  })).min(2),
  targetAudience: z.object({
    userType: z.enum(['student', 'owner', 'all']).optional(),
    countries: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional(),
  }).optional(),
  metrics: z.array(z.object({
    name: z.string(),
    type: z.enum(['conversion', 'engagement', 'revenue', 'custom']),
    eventName: z.string(),
    targetValue: z.number().optional(),
  })).min(1),
});

// Track event schema
const trackEventSchema = z.object({
  experimentId: z.string(),
  eventName: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'create_experiment': {
        const body = await request.json();
        const validatedData = createExperimentSchema.parse(body);

        const experimentId = await abTestingService.createExperiment({
          ...validatedData,
          targetAudience: validatedData.targetAudience || {
            userType: 'all',
          },
          status: 'draft',
          startDate: new Date(),
          createdBy: user.id,
        });

        return NextResponse.json({ experimentId });
      }

      case 'start_experiment': {
        const { experimentId } = await request.json();
        await abTestingService.startExperiment(experimentId);
        return NextResponse.json({ success: true });
      }

      case 'stop_experiment': {
        const { experimentId } = await request.json();
        await abTestingService.stopExperiment(experimentId);
        return NextResponse.json({ success: true });
      }

      case 'track_event': {
        const body = await request.json();
        const validatedData = trackEventSchema.parse(body);

        await abTestingService.trackExperimentEvent(
          user.id,
          validatedData.experimentId,
          validatedData.eventName,
          validatedData.properties
        );

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error({ err: error }, 'A/B testing API error:');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const action = searchParams.get('action');
    const experimentId = searchParams.get('experimentId');

    switch (action) {
      case 'get_variant': {
        if (!experimentId) {
          return NextResponse.json(
            { error: 'experimentId required' },
            { status: 400 }
          );
        }

        const variantId = await abTestingService.getUserVariant(user.id, experimentId);
        const config = await abTestingService.getVariantConfig(user.id, experimentId);

        return NextResponse.json({
          variantId,
          config,
        });
      }

      case 'get_results': {
        if (!experimentId) {
          return NextResponse.json(
            { error: 'experimentId required' },
            { status: 400 }
          );
        }

        const results = await abTestingService.getExperimentResults(experimentId);
        return NextResponse.json({ results });
      }

      case 'get_active_experiments': {
        const experiments = await abTestingService.getActiveExperiments(user.id);
        return NextResponse.json({ experiments });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error({ err: error }, 'A/B testing GET error:');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}