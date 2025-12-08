'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Flag, Star, Calendar, DollarSign, User, ChevronLeft, ChevronRight } from 'lucide-react';
// import { Button } from '@/components/ui/button';

// StarRating component
const StarRating: React.FC<{ rating: number; maxRating?: number }> = ({ rating, maxRating = 5 }) => {
  return (
    <div className="flex">
      {Array.from({ length: maxRating }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

interface Review {
  id: string;
  user_id: string;
  overall_rating: number;
  location_rating?: number;
  amenities_rating?: number;
  landlord_rating?: number;
  value_rating?: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  move_in_date?: string;
  move_out_date?: string;
  lease_duration_months?: number;
  rent_amount?: number;
  is_verified: boolean;
  is_anonymous: boolean;
  created_at: string;
  published_at: string;
  helpful_votes: number;
  total_votes: number;
  review_photos?: Array<{
    id: string;
    file_url: string;
    caption?: string;
    sort_order: number;
  }>;
  review_responses?: Array<{
    id: string;
    content: string;
    created_at: string;
    responder_role: string;
  }>;
}

interface ReviewAnalytics {
  total_reviews: number;
  average_rating: number;
  average_location_rating?: number;
  average_amenities_rating?: number;
  average_landlord_rating?: number;
  average_value_rating?: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
  verified_reviews_percentage: number;
  response_rate_percentage: number;
}

interface ReviewsDisplayProps {
  apartmentId: string;
  initialReviews?: Review[];
  initialAnalytics?: ReviewAnalytics;
  onWriteReview?: () => void;
}

export default function ReviewsDisplay({
  apartmentId,
  initialReviews = [],
  initialAnalytics,
  onWriteReview
}: ReviewsDisplayProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(initialAnalytics || null);
  const [loading, setLoading] = useState(!initialReviews.length);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [userVotes, setUserVotes] = useState<Record<string, 'helpful' | 'unhelpful' | null>>({});

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    // Simple toast implementation - could be replaced with a proper toast library
    alert(message);
  };

  const reviewsPerPage = 5;

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reviews?apartmentId=${apartmentId}&page=${currentPage}&limit=${reviewsPerPage}&sort=${sortBy}`
      );
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data.reviews);
      setAnalytics(data.analytics);
      const incomingTotalPages = data.pagination?.totalPages ?? data.totalPages ?? 1;
      setTotalPages(Math.max(1, incomingTotalPages));
      // Keep the current page within bounds if the total pages shrank (e.g., after filters)
      setCurrentPage((prev) => Math.min(prev, Math.max(1, incomingTotalPages)));
    } catch (error) {
      console.error('Error fetching reviews:', error);
      showToast('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [apartmentId, currentPage, sortBy]);

  useEffect(() => {
    if (!initialReviews.length) {
      fetchReviews();
    }
  }, [initialReviews.length, fetchReviews]);

  const handleVote = async (reviewId: string, voteType: 'helpful' | 'unhelpful') => {
    try {
      const response = await fetch('/api/reviews/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reviewId, voteType })
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      const data = await response.json();

      setUserVotes(prev => ({
        ...prev,
        [reviewId]: data.action === 'removed' ? null : voteType
      }));

      setReviews(prev => prev.map(review =>
        review.id === reviewId
          ? {
              ...review,
              helpful_votes: review.helpful_votes + 1,
              total_votes: review.total_votes + 1
            }
          : review
      ));

    } catch (error) {
      console.error('Error voting:', error);
      showToast('Failed to submit vote', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && !reviews.length) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bg-white border rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      {analytics && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Reviews Summary</h3>
            <div className="flex items-center gap-2">
              <StarRating rating={Math.round(analytics.average_rating)} />
              <span className="text-xl font-bold">{analytics.average_rating.toFixed(1)}</span>
              <span className="text-gray-500">({analytics.total_reviews} reviews)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.average_location_rating?.toFixed(1) || 'N/A'}</div>
              <div className="text-sm text-gray-600">Location</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.average_amenities_rating?.toFixed(1) || 'N/A'}</div>
              <div className="text-sm text-gray-600">Amenities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{analytics.average_landlord_rating?.toFixed(1) || 'N/A'}</div>
              <div className="text-sm text-gray-600">Landlord</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{analytics.average_value_rating?.toFixed(1) || 'N/A'}</div>
              <div className="text-sm text-gray-600">Value</div>
            </div>
          </div>
        </div>
      )}

      {/* Write Review Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-medium">Reviews</h3>
        {onWriteReview && (
          <button onClick={onWriteReview} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Write a Review
          </button>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
            <p className="text-gray-500 mb-4">Be the first to share your experience!</p>
            <button
              onClick={onWriteReview}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Write the First Review
            </button>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white border rounded-lg p-6">
              <div className="space-y-4">
                {/* Review Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {review.is_anonymous ? <User className="w-5 h-5 text-gray-500" /> : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {review.is_anonymous ? 'Anonymous' : 'Verified Resident'}
                        </span>
                        {review.is_verified && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(review.published_at)}
                        {review.move_in_date && ` • Moved in ${formatDate(review.move_in_date)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.overall_rating} />
                    <span className="text-sm font-medium">{review.overall_rating}/5</span>
                  </div>
                </div>

                {/* Review Title */}
                <h4 className="font-medium text-lg">{review.title}</h4>

                {/* Review Content */}
                <p className="text-gray-700">{review.content}</p>

                {/* Review Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleVote(review.id, 'helpful')}
                      className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Helpful ({review.helpful_votes})
                    </button>
                    <button
                      onClick={() => handleVote(review.id, 'unhelpful')}
                      className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Not helpful
                    </button>
                  </div>
                  <button className="flex items-center gap-1 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50">
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
