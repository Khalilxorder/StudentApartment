// Personalization Service
// Learns user preferences and provides personalized apartment recommendations

import { rankingService, RankedApartment, UserPreferences } from '../ranking-svc';

export interface UserProfile {
  user_id: string;
  preferences: UserPreferences;
  search_history: SearchHistoryItem[];
  interaction_history: InteractionItem[];
  preference_vector?: number[]; // Learned preference embedding
}

export interface SearchHistoryItem {
  query: string;
  filters: UserPreferences;
  results_viewed: string[]; // Apartment IDs
  timestamp: Date;
}

export interface InteractionItem {
  apartment_id: string;
  interaction_type: 'view' | 'save' | 'inquiry' | 'contact' | 'book';
  duration_seconds?: number; // For views
  timestamp: Date;
}

export interface PersonalizationResult {
  recommendations: Array<{
    apartment_id: string;
    ranking: RankedApartment;
    confidence: number;
    novelty_score: number;
  }>;
  preference_insights: {
    top_preferences: string[];
    budget_range: { min: number; max: number };
    preferred_districts: string[];
    commute_sensitivity: 'low' | 'medium' | 'high';
  };
  exploration_suggestions: Array<{
    apartment_id: string;
    reason: string;
    diversity_score: number;
  }>;
}

export class PersonalizationService {
  private userProfiles = new Map<string, UserProfile>();

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    availableApartments: any[],
    userPreferences?: UserPreferences
  ): Promise<PersonalizationResult> {
    // Load or create user profile
    const profile = await this.loadUserProfile(userId);

    // Merge explicit preferences with learned preferences
    const effectivePreferences = this.mergePreferences(profile, userPreferences);

    // Calculate rankings for all apartments
    const rankings = await Promise.all(
      availableApartments.map(async (apartment) => {
        // Get commute data (placeholder - would come from commute_cache table)
        const commuteMinutes = await this.getCommuteTime(apartment, effectivePreferences.university);

        // Get review data (placeholder)
        const reviewData = await this.getReviewData(apartment.id);

        // Get engagement data (placeholder)
        const engagementData = await this.getEngagementData(apartment.id);

        const rankedResults = await rankingService.rankApartments(
          [apartment],
          effectivePreferences
        );

        const ranking = rankedResults[0];
        return {
          apartment_id: apartment.id,
          ranking,
          confidence: this.calculateConfidence(ranking, profile),
          novelty_score: this.calculateNovelty(apartment, profile),
        };
      })
    );

    // Sort by total score
    rankings.sort((a, b) => b.ranking.score - a.ranking.score);

    // Generate preference insights
    const preferenceInsights = this.generatePreferenceInsights(profile, effectivePreferences);

    // Generate exploration suggestions
    const explorationSuggestions = this.generateExplorationSuggestions(rankings, profile);

    return {
      recommendations: rankings.slice(0, 20), // Top 20 recommendations
      preference_insights: preferenceInsights,
      exploration_suggestions: explorationSuggestions,
    };
  }

  /**
   * Record user interaction for learning
   */
  async recordInteraction(
    userId: string,
    apartmentId: string,
    interactionType: 'view' | 'save' | 'inquiry' | 'contact' | 'book',
    metadata?: { duration_seconds?: number }
  ): Promise<void> {
    const profile = await this.loadUserProfile(userId);

    const interaction: InteractionItem = {
      apartment_id: apartmentId,
      interaction_type: interactionType,
      duration_seconds: metadata?.duration_seconds,
      timestamp: new Date(),
    };

    profile.interaction_history.push(interaction);

    // Keep only last 1000 interactions
    if (profile.interaction_history.length > 1000) {
      profile.interaction_history = profile.interaction_history.slice(-1000);
    }

    // Update preference learning
    await this.updateLearnedPreferences(profile);

    // Save profile
    await this.saveUserProfile(profile);
  }

  /**
   * Record search for preference learning
   */
  async recordSearch(
    userId: string,
    query: string,
    filters: UserPreferences,
    resultsViewed: string[]
  ): Promise<void> {
    const profile = await this.loadUserProfile(userId);

    const searchItem: SearchHistoryItem = {
      query,
      filters,
      results_viewed: resultsViewed,
      timestamp: new Date(),
    };

    profile.search_history.push(searchItem);

    // Keep only last 500 searches
    if (profile.search_history.length > 500) {
      profile.search_history = profile.search_history.slice(-500);
    }

    // Update preferences based on search patterns
    await this.updateSearchBasedPreferences(profile);

    // Save profile
    await this.saveUserProfile(profile);
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(userId: string): Promise<UserProfile> {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    // In production, load from database
    // For now, create a default profile
    const profile: UserProfile = {
      user_id: userId,
      preferences: {},
      search_history: [],
      interaction_history: [],
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  /**
   * Save user profile to database
   */
  private async saveUserProfile(profile: UserProfile): Promise<void> {
    // In production, save to database
    this.userProfiles.set(profile.user_id, profile);
  }

  /**
   * Merge explicit and learned preferences
   */
  private mergePreferences(profile: UserProfile, explicit?: UserPreferences): UserPreferences {
    const learned = profile.preferences;
    const merged: UserPreferences = { ...learned };

    // Override learned preferences with explicit ones
    if (explicit) {
      Object.assign(merged, explicit);
    }

    return merged;
  }

  /**
   * Update learned preferences based on interaction history
   */
  private async updateLearnedPreferences(profile: UserProfile): Promise<void> {
    const interactions = profile.interaction_history.slice(-100); // Last 100 interactions

    if (interactions.length < 10) return; // Need minimum data

    // Analyze interaction patterns
    const savedApartments = interactions
      .filter(i => i.interaction_type === 'save')
      .map(i => i.apartment_id);

    const viewedApartments = interactions
      .filter(i => i.interaction_type === 'view' && i.duration_seconds && i.duration_seconds > 30)
      .map(i => i.apartment_id);

    // This would analyze apartment features to learn preferences
    // For now, just update based on basic patterns
    // In production, this would use more sophisticated ML

    // Placeholder: learn from saved apartments
    if (savedApartments.length > 0) {
      // Could analyze common features of saved apartments
      profile.preferences.preferred_bedrooms = 2; // Example
    }
  }

  /**
   * Update preferences based on search history
   */
  private async updateSearchBasedPreferences(profile: UserProfile): Promise<void> {
    const recentSearches = profile.search_history.slice(-20); // Last 20 searches

    if (recentSearches.length < 5) return;

    // Analyze search patterns
    const budgets = recentSearches
      .map(s => s.filters.budget_max || s.filters.budget_min)
      .filter(Boolean) as number[];

    if (budgets.length > 0) {
      const avgBudget = budgets.reduce((a, b) => a + b, 0) / budgets.length;
      profile.preferences.budget_max = Math.round(avgBudget * 1.2); // 20% buffer
      profile.preferences.budget_min = Math.round(avgBudget * 0.8);
    }

    // Learn preferred districts
    const districts = recentSearches
      .flatMap(s => s.filters.preferred_districts || [])
      .filter((d, i, arr) => arr.indexOf(d) === i); // Unique

    if (districts.length > 0) {
      profile.preferences.preferred_districts = districts;
    }
  }

  /**
   * Get commute time for apartment (placeholder)
   */
  private async getCommuteTime(apartment: any, university?: string): Promise<number | undefined> {
    // In production, query commute_cache table
    // For now, return random reasonable commute time
    if (university) {
      return Math.floor(Math.random() * 30) + 10; // 10-40 minutes
    }
    return undefined;
  }

  /**
   * Get review data for apartment (placeholder)
   */
  private async getReviewData(apartmentId: string): Promise<{ avg_rating?: number; review_count?: number } | undefined> {
    // In production, query reviews table
    return {
      avg_rating: 4.0 + Math.random() * 1.0, // 4.0-5.0
      review_count: Math.floor(Math.random() * 20), // 0-20 reviews
    };
  }

  /**
   * Get engagement data for apartment (placeholder)
   */
  private async getEngagementData(apartmentId: string): Promise<{ view_count?: number; save_count?: number; inquiry_count?: number } | undefined> {
    // In production, query analytics tables
    return {
      view_count: Math.floor(Math.random() * 200),
      save_count: Math.floor(Math.random() * 10),
      inquiry_count: Math.floor(Math.random() * 5),
    };
  }

  /**
   * Calculate confidence in ranking
   */
  private calculateConfidence(ranking: RankedApartment, profile: UserProfile): number {
    // Higher confidence if ranking is based on user's explicit preferences
    // Lower confidence for new users or when using defaults
    const interactionCount = profile.interaction_history.length;
    const searchCount = profile.search_history.length;

    let confidence = 0.5; // Base confidence

    if (interactionCount > 50) confidence += 0.2;
    if (searchCount > 10) confidence += 0.2;
    if (ranking.components.constraint > 0.8) confidence += 0.1; // Strong constraint match

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate novelty score (how different from user's usual preferences)
   */
  private calculateNovelty(apartment: any, profile: UserProfile): number {
    // In production, compare apartment features to user's interaction history
    // For now, return random novelty score
    return Math.random();
  }

  /**
   * Generate preference insights
   */
  private generatePreferenceInsights(profile: UserProfile, preferences: UserPreferences) {
    const insights = {
      top_preferences: [] as string[],
      budget_range: { min: 0, max: 0 },
      preferred_districts: [] as string[],
      commute_sensitivity: 'medium' as 'low' | 'medium' | 'high',
    };

    // Analyze preferences
    if (preferences.budget_max) {
      insights.budget_range.max = preferences.budget_max;
      insights.budget_range.min = preferences.budget_min || Math.round(preferences.budget_max * 0.7);
    }

    if (preferences.preferred_districts) {
      insights.preferred_districts = preferences.preferred_districts;
    }

    if (preferences.max_commute_minutes) {
      if (preferences.max_commute_minutes <= 20) {
        insights.commute_sensitivity = 'high';
      } else if (preferences.max_commute_minutes >= 40) {
        insights.commute_sensitivity = 'low';
      }
    }

    // Generate top preferences list
    insights.top_preferences = [];
    if (preferences.must_have_furnished) insights.top_preferences.push('Furnished apartments');
    if (preferences.preferred_bedrooms) insights.top_preferences.push(`${preferences.preferred_bedrooms}+ bedrooms`);
    if (preferences.max_commute_minutes) insights.top_preferences.push(`≤${preferences.max_commute_minutes}min commute`);
    if (preferences.preferred_districts?.length) insights.top_preferences.push(`Districts: ${preferences.preferred_districts.join(', ')}`);

    return insights;
  }

  /**
   * Generate exploration suggestions
   */
  private generateExplorationSuggestions(
    rankings: Array<{ apartment_id: string; ranking: RankedApartment; novelty_score: number }>,
    profile: UserProfile
  ) {
    // Find apartments with high novelty but reasonable ranking
    const explorationCandidates = rankings
      .filter(r => r.novelty_score > 0.7 && r.ranking.score > 0.6)
      .sort((a, b) => b.novelty_score - a.novelty_score)
      .slice(0, 5);

    return explorationCandidates.map(candidate => ({
      apartment_id: candidate.apartment_id,
      reason: 'Try something different from your usual preferences',
      diversity_score: candidate.novelty_score,
    }));
  }
}

export const personalizationService = new PersonalizationService();