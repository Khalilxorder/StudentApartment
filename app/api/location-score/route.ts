import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { locationScoreService } from '@/services/location-score-svc';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radius = parseInt(searchParams.get('radius') || '1000');

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Valid lat and lng parameters required' },
        { status: 400 }
      );
    }

    // Validate coordinates are reasonable
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // Limit radius to 5km max
    const safeRadius = Math.min(Math.max(radius, 100), 5000);

    const scores = await locationScoreService.getLocationScores(lat, lng, safeRadius);

    return NextResponse.json({
      success: true,
      data: scores
    });
  } catch (error) {
    logger.error({ err: error }, 'Location score API error:');
    return NextResponse.json(
      { error: 'Failed to calculate location scores' },
      { status: 500 }
    );
  }
}
