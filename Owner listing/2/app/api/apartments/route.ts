// FILE: app/api/apartments/route.ts
import { createClient } from '@/utils/supabaseClient';
import { NextResponse } from 'next/server';
import { sanitizeUserInput } from '@/lib/sanitize';
import { validateInput, apartmentSchema } from '@/lib/validation/schemas';

// Simple in-memory cache for apartment listings
const apartmentsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

function getCacheKey(searchParams: URLSearchParams): string {
  // Create cache key from relevant search parameters
  const params = ['page', 'limit', 'district', 'bedrooms', 'min_price', 'max_price'];
  const cacheKey = params.map(param => `${param}=${searchParams.get(param) || ''}`).join('&');
  return cacheKey;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const formData: any = await request.formData();

    // Extract and validate data
    const apartmentData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      price_huf: Number(formData.get('price')),
      size_sqm: Number(formData.get('size_sqm')),
      bedrooms: Number(formData.get('bedrooms')),
      bathrooms: Number(formData.get('bathrooms')),
      district: Number(formData.get('district')),
      address: formData.get('address') as string,
      latitude: formData.get('lat') ? Number(formData.get('lat')) : undefined,
      longitude: formData.get('lng') ? Number(formData.get('lng')) : undefined,
      is_available: true,
      deposit_months: formData.get('deposit_months') ? Number(formData.get('deposit_months')) : undefined,
      image_urls: formData.getAll('imageUrls[]') as string[],
    };

    // Validate input
    const validation = validateInput(apartmentSchema, apartmentData);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validation.error}` },
        { status: 400 }
      );
    }

    // Sanitize text inputs
    const sanitizedData = {
      ...validation.data,
      title: sanitizeUserInput(validation.data.title, false),
      description: sanitizeUserInput(validation.data.description, true),
      address: sanitizeUserInput(validation.data.address, false),
    };

    const { data, error } = await supabase
      .from('apartments')
      .insert([sanitizedData])
      .select();

    if (error) {
      console.error('Failed to insert apartment:', error);
      return NextResponse.json(
        { error: 'Failed to create apartment', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data[0],
      message: 'Apartment created successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error creating apartment:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cacheKey = getCacheKey(searchParams);

    // Check cache first
    const cached = apartmentsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('📋 Using cached apartments data');
      return NextResponse.json(cached.data);
    }

    const supabase = createClient();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50); // Max 50 per page
    const offset = (page - 1) * limit;

    // Build query with filters
    let query = supabase
      .from('apartments')
      .select('*', { count: 'exact' })
      .eq('is_available', true)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Apply filters
    const district = searchParams.get('district');
    if (district) {
      query = query.eq('district', parseInt(district));
    }

    const bedrooms = searchParams.get('bedrooms');
    if (bedrooms) {
      query = query.gte('bedrooms', parseInt(bedrooms));
    }

    const minPrice = searchParams.get('min_price');
    if (minPrice) {
      query = query.gte('price_huf', parseInt(minPrice));
    }

    const maxPrice = searchParams.get('max_price');
    if (maxPrice) {
      query = query.lte('price_huf', parseInt(maxPrice));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch apartments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch apartments', details: error.message },
        { status: 500 }
      );
    }

    const responseData = {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: offset + limit < (count || 0),
        hasPrev: page > 1
      }
    };

    // Cache the response
    apartmentsCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    // Clean up old cache entries periodically
    if (apartmentsCache.size > 50) {
      const cutoff = Date.now() - CACHE_DURATION;
      const keysToDelete: string[] = [];
      
      apartmentsCache.forEach((value, key) => {
        if (value.timestamp < cutoff) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => apartmentsCache.delete(key));
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Unexpected error fetching apartments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
