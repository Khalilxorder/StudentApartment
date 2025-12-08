import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

interface CommuteMatrixRequest {
  apartmentIds: string[];
  universityIds: string[];
  modes?: ('transit' | 'walking' | 'bicycling' | 'driving')[];
}

/**
 * POST /api/commute/matrix
 * Calculate commute times for multiple apartments and universities
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CommuteMatrixRequest;
    const {
      apartmentIds,
      universityIds,
      modes = ['transit', 'walking'],
    } = body;

    if (!apartmentIds?.length || !universityIds?.length) {
      return NextResponse.json(
        { error: 'apartmentIds and universityIds arrays are required' },
        { status: 400 }
      );
    }

    const matrix: Record<
      string,
      Record<string, Record<string, unknown>>
    > = {};

    for (const apartmentId of apartmentIds) {
      matrix[apartmentId] = {};

      for (const universityId of universityIds) {
        matrix[apartmentId][universityId] = {};

        for (const mode of modes) {
          try {
            // Call commute calculation for each mode
            const response = await fetch(
              `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/commute`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  apartmentId,
                  universityId,
                  mode,
                }),
              }
            );
            if (response.ok) {
              const data = (await response.json()) as { result: unknown };
              matrix[apartmentId][universityId][mode] = data.result;
            }
          } catch (err) {
            logger.warn(
              { err, apartmentId, universityId, mode },
              'Failed to calculate commute'
            );
            matrix[apartmentId][universityId][mode] = null;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      matrix,
      summary: {
        apartments: apartmentIds.length,
        universities: universityIds.length,
        modes: modes.length,
        totalCalculations: apartmentIds.length * universityIds.length * modes.length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error calculating commute matrix:');
    return NextResponse.json(
      { error: 'Failed to calculate commute matrix' },
      { status: 500 }
    );
  }
}
