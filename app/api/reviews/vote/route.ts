import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { z } from 'zod';

const voteSchema = z.object({
  reviewId: z.string().uuid(),
  voteType: z.enum(['helpful', 'unhelpful'])
});

// POST /api/reviews/vote - Vote on a review
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
    const validationResult = voteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { reviewId, voteType } = validationResult.data;

    // Check if review exists and is approved
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, status')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.status !== 'approved') {
      return NextResponse.json(
        { error: 'Cannot vote on unapproved reviews' },
        { status: 400 }
      );
    }

    // Check if user already voted on this review
    const { data: existingVote } = await supabase
      .from('review_votes')
      .select('id, vote_type')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // User is trying to vote the same way again - remove the vote
        const { error: deleteError } = await supabase
          .from('review_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error('Error removing vote:', deleteError);
          return NextResponse.json(
            { error: 'Failed to remove vote' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: 'Vote removed',
          action: 'removed'
        });
      } else {
        // User is changing their vote
        const { error: updateError } = await supabase
          .from('review_votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        if (updateError) {
          console.error('Error updating vote:', updateError);
          return NextResponse.json(
            { error: 'Failed to update vote' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: 'Vote updated',
          action: 'updated'
        });
      }
    } else {
      // New vote
      const { error: insertError } = await supabase
        .from('review_votes')
        .insert({
          review_id: reviewId,
          user_id: user.id,
          vote_type: voteType
        });

      if (insertError) {
        console.error('Error creating vote:', insertError);
        return NextResponse.json(
          { error: 'Failed to create vote' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Vote recorded',
        action: 'created'
      });
    }

  } catch (error) {
    console.error('Review vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/reviews/vote - Get user's vote on a review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: vote, error } = await supabase
      .from('review_votes')
      .select('vote_type')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching vote:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vote' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      vote: vote || null
    });

  } catch (error) {
    console.error('Get vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}