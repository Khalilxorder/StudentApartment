// FILE: app/api/neighborhood/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const NeighborhoodRequestSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
});

type NeighborhoodData = {
  walkScore?: {
    score: number;
    description: string;
    updated: string;
  };
  transitScore?: {
    score: number;
    description: string;
    summary: string;
  };
  bikeScore?: {
    score: number;
    description: string;
  };
  nearbyAmenities: {
    restaurants: number;
    grocery: number;
    shopping: number;
    cafes: number;
    gyms: number;
    parks: number;
    schools: number;
    hospitals: number;
  };
  safety?: {
    score: number;
    description: string;
  };
  priceTrends?: {
    averagePrice: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };
};

async function getWalkScoreData(latitude: number, longitude: number): Promise<Partial<NeighborhoodData>> {
  try {
    const WALKSCORE_API_KEY = process.env.WALKSCORE_API_KEY;
    if (!WALKSCORE_API_KEY) {
      console.warn('Walk Score API key not configured');
      return {};
    }

    const response = await fetch(
      `https://api.walkscore.com/score?format=json&lat=${latitude}&lon=${longitude}&wsapikey=${WALKSCORE_API_KEY}&transit=1&bike=1`
    );

    if (!response.ok) {
      console.warn('Walk Score API request failed:', response.status);
      return {};
    }

    const data = await response.json();

    return {
      walkScore: data.walkscore ? {
        score: data.walkscore,
        description: data.description || '',
        updated: data.updated || new Date().toISOString(),
      } : undefined,
      transitScore: data.transit ? {
        score: data.transit.score,
        description: data.transit.description || '',
        summary: data.transit.summary || '',
      } : undefined,
      bikeScore: data.bike ? {
        score: data.bike.score,
        description: data.bike.description || '',
      } : undefined,
    };
  } catch (error) {
    console.error('Error fetching Walk Score data:', error);
    return {};
  }
}

async function getGooglePlacesData(latitude: number, longitude: number): Promise<Partial<NeighborhoodData>> {
  try {
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn('Google Places API key not configured');
      return {};
    }

    const placeTypes = [
      { type: 'restaurant', key: 'restaurants' },
      { type: 'supermarket', key: 'grocery' },
      { type: 'shopping_mall', key: 'shopping' },
      { type: 'cafe', key: 'cafes' },
      { type: 'gym', key: 'gyms' },
      { type: 'park', key: 'parks' },
      { type: 'school', key: 'schools' },
      { type: 'hospital', key: 'hospitals' },
    ];

    const nearbyAmenities: { [key: string]: number } = {};

    // Fetch nearby places for each type
    const promises = placeTypes.map(async ({ type, key }) => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1500&type=${type}&key=${GOOGLE_PLACES_API_KEY}`
        );

        if (response.ok) {
          const data = await response.json();
          nearbyAmenities[key] = data.results?.length || 0;
        } else {
          nearbyAmenities[key] = 0;
        }
      } catch (error) {
        console.error(`Error fetching ${type} data:`, error);
        nearbyAmenities[key] = 0;
      }
    });

    await Promise.all(promises);

    return {
      nearbyAmenities: nearbyAmenities as any,
    };
  } catch (error) {
    console.error('Error fetching Google Places data:', error);
    return {
      nearbyAmenities: {
        restaurants: 0,
        grocery: 0,
        shopping: 0,
        cafes: 0,
        gyms: 0,
        parks: 0,
        schools: 0,
        hospitals: 0,
      },
    };
  }
}

async function getSafetyData(latitude: number, longitude: number): Promise<Partial<NeighborhoodData>> {
  // For now, return mock safety data
  // In production, you might integrate with crime data APIs
  const safetyScore = Math.floor(Math.random() * 40) + 60; // 60-100 range

  let description = '';
  if (safetyScore >= 90) description = 'Very Safe';
  else if (safetyScore >= 80) description = 'Safe';
  else if (safetyScore >= 70) description = 'Moderately Safe';
  else if (safetyScore >= 60) description = 'Somewhat Safe';
  else description = 'Less Safe';

  return {
    safety: {
      score: safetyScore,
      description,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, address } = NeighborhoodRequestSchema.parse(body);

    // Fetch data from multiple APIs in parallel
    const [walkScoreData, placesData, safetyData] = await Promise.all([
      getWalkScoreData(latitude, longitude),
      getGooglePlacesData(latitude, longitude),
      getSafetyData(latitude, longitude),
    ]);

    // Combine all neighborhood data
    const neighborhoodData: NeighborhoodData = {
      ...walkScoreData,
      ...placesData,
      ...safetyData,
      nearbyAmenities: {
        restaurants: placesData.nearbyAmenities?.restaurants || 0,
        grocery: placesData.nearbyAmenities?.grocery || 0,
        shopping: placesData.nearbyAmenities?.shopping || 0,
        cafes: placesData.nearbyAmenities?.cafes || 0,
        gyms: placesData.nearbyAmenities?.gyms || 0,
        parks: placesData.nearbyAmenities?.parks || 0,
        schools: placesData.nearbyAmenities?.schools || 0,
        hospitals: placesData.nearbyAmenities?.hospitals || 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: neighborhoodData,
      cached: false, // TODO: Implement caching
    });

  } catch (error) {
    console.error('Neighborhood API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const address = searchParams.get('address');

  if (!lat || !lng) {
    return NextResponse.json(
      { success: false, error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { success: false, error: 'Invalid latitude or longitude' },
      { status: 400 }
    );
  }

  // Reuse the POST logic
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude, address }),
    headers: { 'content-type': 'application/json' },
  });

  return POST(mockRequest);
}