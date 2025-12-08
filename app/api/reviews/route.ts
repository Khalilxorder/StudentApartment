import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Create a simple supabase client for API routes (no cookie-based auth needed for GET requests)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Validation schema for review submission
const reviewSchema = z.object({
  apartmentId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  overallRating: z.number().min(1).max(5),
  locationRating: z.number().min(1).max(5).optional(),
  amenitiesRating: z.number().min(1).max(5).optional(),
  landlordRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  title: z.string().min(5).max(100),
  content: z.string().min(10).max(2000),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  moveInDate: z.string().optional(),
  moveOutDate: z.string().optional(),
  leaseDurationMonths: z.number().min(1).max(120).optional(),
  rentAmount: z.number().min(0).optional(),
  isAnonymous: z.boolean().default(false),
  photos: z.array(z.string()).default([])
});

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get apartment reviews
 *     description: Retrieves reviews for a specific apartment with pagination
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: apartmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
// GET /api/reviews - Get reviews for an apartment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apartmentId = searchParams.get('apartmentId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    // Accept both "sort" and legacy "sortBy" query params
    const sortBy = searchParams.get('sort') || searchParams.get('sortBy') || 'newest'; // newest, oldest, highest, lowest, helpful

    if (!apartmentId) {
      return NextResponse.json(
        { error: 'Apartment ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // First check if reviews table exists by trying a simple query
    const { error: tableCheckError } = await supabase
      .from('reviews')
      .select('id')
      .limit(1);

    // If the reviews table doesn't exist, return empty result gracefully
    if (tableCheckError) {
      logger.info({ error: tableCheckError.message }, 'Reviews table check error');
      return NextResponse.json({
        reviews: [],
        analytics: null,
        totalPages: 0,
        pagination: { page, limit, total: 0, totalPages: 0 }
      });
    }

    // Build query - start simple without relations that may not exist
    let query = supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('apartment_id', apartmentId)
      .eq('status', 'approved');

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'highest':
        query = query.order('overall_rating', { ascending: false });
        break;
      case 'lowest':
        query = query.order('overall_rating', { ascending: true });
        break;
      case 'helpful':
        // This would require a more complex query with vote aggregation
        query = query.order('created_at', { ascending: false });
        break;
      default: // newest
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: reviews, error, count } = await query;

    if (error) {
      logger.error({ error, apartmentId }, 'Error fetching reviews');
      // If related tables don't exist, just return empty reviews
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          reviews: [],
          analytics: null,
          totalPages: 0,
          pagination: { page, limit, total: 0, totalPages: 0 }
        });
      }
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Get review analytics (ignore errors if table doesn't exist)
    let analytics = null;
    try {
      const { data } = await supabase
        .from('review_analytics')
        .select('*')
        .eq('apartment_id', apartmentId)
        .single();
      analytics = data;
    } catch (analyticsError) {
      // Analytics table may not exist, that's OK
    }

    // Process reviews (votes are no longer fetched inline to avoid join errors)
    const processedReviews = reviews?.map((review: any) => ({
      ...review,
      helpful_votes: review.helpful_votes || 0,
      total_votes: review.total_votes || 0
    })) || [];

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      reviews: processedReviews,
      analytics,
      totalPages,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    logger.error({ error }, 'Reviews API error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = reviewSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const reviewData = validationResult.data;

    // Verify user has a completed booking for this apartment (if bookingId provided)
    if (reviewData.bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, payment_status, user_id')
        .eq('id', reviewData.bookingId)
        .eq('apartment_id', reviewData.apartmentId)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: 'Invalid booking ID' },
          { status: 400 }
        );
      }

      if (booking.user_id !== user.id) {
        return NextResponse.json(
          { error: 'You can only review apartments you have booked' },
          { status: 403 }
        );
      }

      if (booking.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Only completed bookings can be reviewed' },
          { status: 400 }
        );
      }
    }

    // Check if user already reviewed this apartment
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('apartment_id', reviewData.apartmentId)
      .eq('user_id', user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this apartment' },
        { status: 400 }
      );
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        apartment_id: reviewData.apartmentId,
        user_id: user.id,
        booking_id: reviewData.bookingId,
        overall_rating: reviewData.overallRating,
        location_rating: reviewData.locationRating,
        amenities_rating: reviewData.amenitiesRating,
        landlord_rating: reviewData.landlordRating,
        value_rating: reviewData.valueRating,
        title: reviewData.title,
        content: reviewData.content,
        pros: reviewData.pros,
        cons: reviewData.cons,
        move_in_date: reviewData.moveInDate,
        move_out_date: reviewData.moveOutDate,
        lease_duration_months: reviewData.leaseDurationMonths,
        rent_amount: reviewData.rentAmount,
        is_anonymous: reviewData.isAnonymous,
        status: 'pending' // All reviews start as pending for moderation
      })
      .select()
      .single();

    if (reviewError) {
      logger.error({ reviewError, apartmentId: reviewData.apartmentId }, 'Error creating review');
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      );
    }

    // Add photos if provided
    if (reviewData.photos && reviewData.photos.length > 0) {
      const photoInserts = reviewData.photos.map((url, index) => ({
        review_id: review.id,
        user_id: user.id,
        file_url: url,
        sort_order: index
      }));

      const { error: photoError } = await supabase
        .from('review_photos')
        .insert(photoInserts);

      if (photoError) {
        logger.error({ photoError, reviewId: review.id }, 'Error adding review photos');
        // Don't fail the whole request for photo errors
      }
    }

    // Trigger analytics recalculation
    await supabase.rpc('recalculate_review_analytics', {
      target_apartment_id: reviewData.apartmentId
    });

    return NextResponse.json({
      review,
      message: 'Review submitted successfully and is pending moderation'
    }, { status: 201 });

  } catch (error) {
    logger.error({ error }, 'Review creation error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
