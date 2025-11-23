import { NextRequest, NextResponse } from 'next/server';

// Ranking Service - ML-driven scoring algorithm
// Combines multiple factors for apartment recommendations

interface ApartmentData {
  id: string;
  price: number;
  rooms: number;
  location: string;
  amenities: string[];
  verified: boolean;
  mediaScore: number;
  completenessScore: number;
  commuteTime?: number;
  marketValue: number;
  engagement: {
    views: number;
    saves: number;
    messages: number;
  };
}

interface UserPreferences {
  budget: { min: number; max: number };
  rooms: number;
  commuteMax: number;
  university: string;
  mustHaves: string[];
  personality: {
    quiet: number; // 0-1
    social: number; // 0-1
  };
}

interface RankingResult {
  apartmentId: string;
  score: number;
  components: {
    constraintFit: number;
    personalFit: number;
    accessibility: number;
    trustQuality: number;
    marketValue: number;
    engagement: number;
  };
  reasons: string[];
}

class RankingService {
  private banditWeights = {
    constraintFit: 0.3,
    personalFit: 0.2,
    accessibility: 0.1,
    trustQuality: 0.2,
    marketValue: 0.1,
    engagement: 0.1,
  };

  private explorationRate = 0.1; // ε-greedy

  async rankApartments(
    apartments: ApartmentData[],
    userPrefs: UserPreferences
  ): Promise<RankingResult[]> {
    const results: RankingResult[] = [];

    for (const apartment of apartments) {
      const components = this.calculateComponents(apartment, userPrefs);
      const score = this.calculateScore(components);

      // Add exploration noise
      const finalScore = this.addExplorationNoise(score);

      results.push({
        apartmentId: apartment.id,
        score: finalScore,
        components,
        reasons: this.generateReasons(components, apartment),
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private calculateComponents(apartment: ApartmentData, prefs: UserPreferences) {
    return {
      constraintFit: this.calculateConstraintFit(apartment, prefs),
      personalFit: this.calculatePersonalFit(apartment, prefs),
      accessibility: this.calculateAccessibility(apartment),
      trustQuality: this.calculateTrustQuality(apartment),
      marketValue: this.calculateMarketValue(apartment),
      engagement: this.calculateEngagement(apartment),
    };
  }

  private calculateConstraintFit(apartment: ApartmentData, prefs: UserPreferences): number {
    let score = 0;
    let total = 0;

    // Price fit
    if (apartment.price >= prefs.budget.min && apartment.price <= prefs.budget.max) {
      score += 1;
    }
    total += 1;

    // Rooms fit
    if (apartment.rooms >= prefs.rooms) {
      score += 1;
    }
    total += 1;

    // Commute fit
    if (apartment.commuteTime && apartment.commuteTime <= prefs.commuteMax) {
      score += 1;
    }
    total += 1;

    // Must-haves
    const hasMustHaves = prefs.mustHaves.every(amenity =>
      apartment.amenities.includes(amenity)
    );
    if (hasMustHaves) {
      score += 1;
    }
    total += 1;

    return score / total;
  }

  private calculatePersonalFit(apartment: ApartmentData, prefs: UserPreferences): number {
    // Simple personality-based scoring
    // In production, this would use more sophisticated ML
    return 0.5; // Placeholder
  }

  private calculateAccessibility(apartment: ApartmentData): number {
    // Based on floor, elevator, etc.
    return 0.8; // Placeholder
  }

  private calculateTrustQuality(apartment: ApartmentData): number {
    return (
      (apartment.verified ? 1 : 0) * 0.4 +
      apartment.mediaScore * 0.3 +
      apartment.completenessScore * 0.3
    );
  }

  private calculateMarketValue(apartment: ApartmentData): number {
    // Z-score based on district pricing
    return 0.5; // Placeholder
  }

  private calculateEngagement(apartment: ApartmentData): number {
    // Normalized engagement score
    const { views, saves, messages } = apartment.engagement;
    return Math.min((views * 0.1 + saves * 0.3 + messages * 0.6) / 100, 1);
  }

  private calculateScore(components: any): number {
    return (
      components.constraintFit * this.banditWeights.constraintFit +
      components.personalFit * this.banditWeights.personalFit +
      components.accessibility * this.banditWeights.accessibility +
      components.trustQuality * this.banditWeights.trustQuality +
      components.marketValue * this.banditWeights.marketValue +
      components.engagement * this.banditWeights.engagement
    );
  }

  private addExplorationNoise(score: number): number {
    if (Math.random() < this.explorationRate) {
      // Add random noise for exploration
      return score + (Math.random() - 0.5) * 0.2;
    }
    return score;
  }

  private generateReasons(components: any, apartment: ApartmentData): string[] {
    const reasons: string[] = [];

    if (components.constraintFit > 0.8) {
      reasons.push('Matches all your requirements');
    }

    if (apartment.verified) {
      reasons.push('Verified owner');
    }

    if (apartment.commuteTime && apartment.commuteTime <= 20) {
      reasons.push(`Only ${apartment.commuteTime}min to university`);
    }

    if (components.marketValue > 0.7) {
      reasons.push('Fair market price');
    }

    return reasons;
  }
}

const rankingService = new RankingService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchResults, userPreferences, userId } = body;

    if (!searchResults || !Array.isArray(searchResults)) {
      return NextResponse.json({ error: 'searchResults array required' }, { status: 400 });
    }

    if (!userPreferences) {
      return NextResponse.json({ error: 'userPreferences required' }, { status: 400 });
    }

    // Convert search results to ranking data format
    const apartmentData: any[] = searchResults.map(result => ({
      id: result.apartment.id,
      price: result.apartment.price,
      rooms: result.apartment.rooms,
      location: `${result.apartment.location.lat},${result.apartment.location.lng}`,
      amenities: result.apartment.amenities,
      verified: result.apartment.owner.verified,
      mediaScore: result.apartment.photos?.length > 0 ? 0.8 : 0.4,
      completenessScore: calculateCompletenessScore(result.apartment),
      commuteTime: result.commuteTime,
      marketValue: 0.5, // Placeholder - would be calculated from market data
      engagement: {
        views: Math.floor(Math.random() * 100), // Placeholder
        saves: Math.floor(Math.random() * 20),  // Placeholder
        messages: Math.floor(Math.random() * 5), // Placeholder
      },
    }));

    // Rank apartments
    const rankingResults = await rankingService.rankApartments(apartmentData, userPreferences);

    // Merge ranking scores back into search results
    const rankedResults = searchResults.map(searchResult => {
      const ranking = rankingResults.find(r => r.apartmentId === searchResult.apartment.id);
      return {
        ...searchResult,
        rankingScore: ranking?.score || 0.5,
        rankingComponents: ranking?.components || {},
        rankingReasons: ranking?.reasons || [],
        finalScore: (searchResult.score + (ranking?.score || 0.5)) / 2, // Combine search and ranking scores
      };
    }).sort((a, b) => b.finalScore - a.finalScore);

    // Update bandit weights based on user interaction (if userId provided)
    if (userId) {
      // This would be called when user interacts with results
      // For now, just log that we would update weights
      console.log(`Would update bandit weights for user ${userId}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        results: rankedResults,
        rankingStats: {
          totalResults: rankedResults.length,
          averageScore: rankedResults.reduce((sum, r) => sum + r.finalScore, 0) / rankedResults.length,
          topScore: rankedResults[0]?.finalScore || 0,
        },
      },
    });

  } catch (error) {
    console.error('Ranking API error:', error);
    return NextResponse.json(
      { error: 'Ranking failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function calculateCompletenessScore(apartment: any): number {
  let score = 0;
  let total = 0;

  // Title and description
  if (apartment.title) score += 1;
  total += 1;
  if (apartment.description && apartment.description.length > 50) score += 1;
  total += 1;

  // Photos
  if (apartment.photos && apartment.photos.length > 0) score += 1;
  total += 1;

  // Amenities
  if (apartment.amenities && apartment.amenities.length > 0) score += 1;
  total += 1;

  // Location details
  if (apartment.district) score += 1;
  total += 1;

  // Owner verification
  if (apartment.owner?.verified) score += 1;
  total += 1;

  return score / total;
}