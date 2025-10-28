import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { z } from 'zod';

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

// GET /api/reviews - Get reviews for an apartment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apartmentId = searchParams.get('apartmentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'newest'; // newest, oldest, highest, lowest, helpful

    if (!apartmentId) {
      return NextResponse.json(
        { error: 'Apartment ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Build query based on sort criteria
    let query = supabase
      .from('reviews')
      .select(`
        *,
        review_photos (
          id,
          file_url,
          caption,
          sort_order
        ),
        review_votes (
          vote_type
        ),
        review_responses (
          id,
          content,
          created_at,
          responder_role
        )
      `)
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
      console.error('Error fetching reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }

    // Get review analytics
    const { data: analytics } = await supabase
      .from('review_analytics')
      .select('*')
      .eq('apartment_id', apartmentId)
      .single();

    // Process reviews to include helpful vote counts
    const processedReviews = reviews?.map((review: any) => ({
      ...review,
      helpful_votes: review.review_votes?.filter((v: any) => v.vote_type === 'helpful').length || 0,
      total_votes: review.review_votes?.length || 0
    })) || [];

    return NextResponse.json({
      reviews: processedReviews,
      analytics,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

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
      console.error('Error creating review:', reviewError);
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
        console.error('Error adding review photos:', photoError);
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
    console.error('Review creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}