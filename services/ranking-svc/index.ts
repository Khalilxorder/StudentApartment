import { runQuery } from '@/lib/db/pool';

export interface CandidateApartment {
  id: string;
  price: number;
  rooms: number;
  district?: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  verified?: boolean;
  mediaScore?: number;
  completenessScore?: number;
  commuteTime?: number | null;
  marketValue?: number | null;
  engagement?: {
    views?: number;
    saves?: number;
    messages?: number;
  };
  furnished?: boolean;
  hasElevator?: boolean;
  reasonHints?: string[];
  reasonCodes?: string[];
}

export interface RankingComponents {
  constraint: number;
  preference: number;
  accessibility: number;
  trust: number;
  market: number;
  engagement: number;
}

export interface RankedApartment {
  apartmentId: string;
  score: number;
  components: RankingComponents;
  reasons: string[];
  reasonCodes: string[];
  tradeOffs: string[];
}

export interface RankingWeights {
  constraint: number;
  preference: number;
  accessibility: number;
  trust: number;
  market: number;
  engagement: number;
}

export interface UserPreferences {
  budget_min?: number;
  budget_max?: number;
  preferred_districts?: string[];
  max_commute_minutes?: number;
  university?: string;
  preferred_bedrooms?: number;
  must_have_furnished?: boolean;
  preferred_amenities?: string[];
}

export interface RankContext {
  userId?: string;
  experimentId?: string;
  variantId?: string;
  logTopN?: number;
}

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const addReason = (
  reasons: Set<string>,
  reasonCodes: Set<string>,
  message: string,
  code: string,
) => {
  reasons.add(message);
  reasonCodes.add(code);
};

class RankingService {
  private readonly defaultWeights: RankingWeights = {
    constraint: 0.25,
    preference: 0.2,
    accessibility: 0.15,
    trust: 0.15,
    market: 0.1,
    engagement: 0.15,
  };

  private cachedWeights: RankingWeights | null = null;

  async rankApartments(
    apartments: CandidateApartment[],
    preferences: UserPreferences,
    context?: RankContext,
  ): Promise<RankedApartment[]> {
    if (!apartments.length) {
      return [];
    }

    const weights = await this.getWeights();
    const ranked = apartments.map((apartment) =>
      this.evaluateCandidate(apartment, preferences, weights),
    );

    ranked.sort((a, b) => b.score - a.score);

    await this.logRankingEvents(ranked, context);
    return ranked;
  }

  async logRankingResults(
    ranked: RankedApartment[],
    context?: RankContext,
  ): Promise<void> {
    await this.logRankingEvents(ranked, context);
  }

  private async getWeights(): Promise<RankingWeights> {
    if (this.cachedWeights) {
      return this.cachedWeights;
    }

    try {
      const { rows } = await runQuery(
        `
          SELECT weights
          FROM public.ranking_weight_history
          ORDER BY created_at DESC
          LIMIT 1
        `,
      );

      if (rows?.[0]?.weights) {
        this.cachedWeights = {
          ...this.defaultWeights,
          ...rows[0].weights,
        };
      } else {
        this.cachedWeights = this.defaultWeights;
      }
    } catch (error) {
      console.warn('Ranking weights fallback to defaults:', error);
      this.cachedWeights = this.defaultWeights;
    }

    return this.cachedWeights ?? this.defaultWeights;
  }

  invalidateWeightCache(): void {
    this.cachedWeights = null;
  }

  private evaluateCandidate(
    apartment: CandidateApartment,
    preferences: UserPreferences,
    weights: RankingWeights,
  ): RankedApartment {
    const reasons = new Set(apartment.reasonHints ?? []);
    const reasonCodes = new Set(apartment.reasonCodes ?? []);
    const tradeOffs = new Set<string>();

    const constraint = this.scoreConstraints(
      apartment,
      preferences,
      reasons,
      reasonCodes,
      tradeOffs,
    );

    const preference = this.scorePreferences(
      apartment,
      preferences,
      reasons,
      reasonCodes,
      tradeOffs,
    );

    const accessibility = this.scoreAccessibility(
      apartment,
      preferences,
      reasons,
      reasonCodes,
      tradeOffs,
    );

    const trust = this.scoreTrust(apartment, reasons, reasonCodes);

    const market = this.scoreMarket(apartment, reasons, reasonCodes, tradeOffs);

    const engagement = this.scoreEngagement(apartment, reasons, reasonCodes);

    const components: RankingComponents = {
      constraint,
      preference,
      accessibility,
      trust,
      market,
      engagement,
    };

    const totalWeight = Object.values(weights).reduce(
      (sum, value) => sum + value,
      0,
    );

    const weightedScore =
      constraint * weights.constraint +
      preference * weights.preference +
      accessibility * weights.accessibility +
      trust * weights.trust +
      market * weights.market +
      engagement * weights.engagement;

    const finalScore = clamp(weightedScore / totalWeight);

    return {
      apartmentId: apartment.id,
      score: Number(finalScore.toFixed(3)),
      components,
      reasons: Array.from(reasons),
      reasonCodes: Array.from(reasonCodes),
      tradeOffs: Array.from(tradeOffs),
    };
  }

  private scoreConstraints(
    apartment: CandidateApartment,
    preferences: UserPreferences,
    reasons: Set<string>,
    reasonCodes: Set<string>,
    tradeOffs: Set<string>,
  ): number {
    let score = 1;

    if (preferences.budget_max) {
      const diff = apartment.price - preferences.budget_max;
      if (diff > 0) {
        const penalty = clamp(diff / preferences.budget_max, 0, 0.7);
        score -= penalty;
        tradeOffs.add(
          `Over budget by ${(diff).toLocaleString()} HUF`,
        );
        reasonCodes.add('over_budget');
      } else {
        addReason(reasons, reasonCodes, 'Within your budget', 'within_budget');
      }
    }

    if (preferences.must_have_furnished && apartment.furnished === false) {
      score *= 0.2;
      tradeOffs.add('Not furnished');
      reasonCodes.add('missing_furnished');
    }

    return clamp(score);
  }

  private scorePreferences(
    apartment: CandidateApartment,
    preferences: UserPreferences,
    reasons: Set<string>,
    reasonCodes: Set<string>,
    tradeOffs: Set<string>,
  ): number {
    let score = 0.5;

    if (preferences.preferred_bedrooms) {
      if (
        (apartment.bedrooms ?? apartment.rooms) >= preferences.preferred_bedrooms
      ) {
        score += 0.2;
        addReason(
          reasons,
          reasonCodes,
          `${preferences.preferred_bedrooms}+ bedrooms`,
          'bedroom_match',
        );
      } else {
        tradeOffs.add('Fewer bedrooms than preferred');
        reasonCodes.add('bedroom_shortfall');
        score -= 0.2;
      }
    }

    if (
      preferences.preferred_districts?.length &&
      apartment.district &&
      preferences.preferred_districts.some((d) =>
        apartment.district?.toLowerCase().includes(d.toLowerCase()),
      )
    ) {
      score += 0.15;
      addReason(
        reasons,
        reasonCodes,
        `Preferred district (${apartment.district})`,
        'district_match',
      );
    }

    if (preferences.preferred_amenities?.length) {
      const matches =
        apartment.amenities?.filter((amenity) =>
          preferences.preferred_amenities!.includes(amenity),
        ).length ?? 0;
      const ratio =
        preferences.preferred_amenities.length > 0
          ? matches / preferences.preferred_amenities.length
          : 0;
      score += ratio * 0.2;
      if (ratio > 0) {
        addReason(
          reasons,
          reasonCodes,
          'Includes preferred amenities',
          'amenity_match',
        );
      } else {
        reasonCodes.add('amenity_gap');
      }
    }

    return clamp(score);
  }

  private scoreAccessibility(
    apartment: CandidateApartment,
    preferences: UserPreferences,
    reasons: Set<string>,
    reasonCodes: Set<string>,
    tradeOffs: Set<string>,
  ): number {
    if (apartment.commuteTime == null) {
      return 0.5;
    }

    const limit = preferences.max_commute_minutes ?? 30;
    const ratio = apartment.commuteTime / limit;

    if (ratio <= 1) {
      addReason(
        reasons,
        reasonCodes,
        `Commute around ${apartment.commuteTime} minutes`,
        'commute_match',
      );
      return clamp(1 - ratio * 0.25);
    }

    tradeOffs.add(`Commute about ${apartment.commuteTime} minutes`);
    reasonCodes.add('commute_long');
    return clamp(0.5 - (ratio - 1) * 0.4);
  }

  private scoreTrust(
    apartment: CandidateApartment,
    reasons: Set<string>,
    reasonCodes: Set<string>,
  ): number {
    let score = 0.4;

    if (apartment.verified) {
      score += 0.3;
      addReason(reasons, reasonCodes, 'Verified owner', 'verified_owner');
    }

    if (typeof apartment.completenessScore === 'number') {
      score += (apartment.completenessScore - 0.5) * 0.3;
      if (apartment.completenessScore > 0.8) {
        addReason(
          reasons,
          reasonCodes,
          'Complete listing details',
          'high_completeness',
        );
      }
    }

    if (typeof apartment.mediaScore === 'number') {
      score += (apartment.mediaScore - 0.5) * 0.2;
      if (apartment.mediaScore > 0.8) {
        addReason(
          reasons,
          reasonCodes,
          'High-quality photos',
          'media_quality',
        );
      }
    }

    return clamp(score);
  }

  private scoreMarket(
    apartment: CandidateApartment,
    reasons: Set<string>,
    reasonCodes: Set<string>,
    tradeOffs: Set<string>,
  ): number {
    if (typeof apartment.marketValue === 'number') {
      const value = clamp(apartment.marketValue);
      if (value > 0.7) {
        addReason(reasons, reasonCodes, 'Fair market price', 'market_match');
      } else if (value < 0.4) {
        tradeOffs.add('Price above market averages');
        reasonCodes.add('market_overpriced');
      }
      return value;
    }

    return 0.5;
  }

  private scoreEngagement(
    apartment: CandidateApartment,
    reasons: Set<string>,
    reasonCodes: Set<string>,
  ): number {
    const engagement = apartment.engagement || {};
    const views = engagement.views ?? 0;
    const saves = engagement.saves ?? 0;
    const messages = engagement.messages ?? 0;

    const score =
      0.4 +
      Math.min(0.3, Math.log10(views + 1) * 0.15) +
      Math.min(0.2, saves * 0.02) +
      Math.min(0.2, messages * 0.04);

    if (saves > 5 || messages > 2) {
      addReason(reasons, reasonCodes, 'Popular with other students', 'high_engagement');
    }

    return clamp(score);
  }

  private async logRankingEvents(
    ranked: RankedApartment[],
    context?: RankContext,
  ) {
    const logCount = context?.logTopN ?? Math.min(ranked.length, 5);
    const subset = ranked.slice(0, logCount);

    if (!subset.length) {
      return;
    }

    const params: any[] = [];
    const values = subset
      .map((result, idx) => {
        const baseIndex = idx * 7;
        params.push(
          context?.userId ?? null,
          result.apartmentId,
          context?.experimentId ?? null,
          context?.variantId ?? null,
          result.score,
          JSON.stringify(result.components),
          result.reasons,
        );

        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}::jsonb, $${baseIndex + 7}::text[])`;
      })
      .join(', ');

    try {
      await runQuery(
        `
          INSERT INTO public.ranking_events (
            user_id,
            apartment_id,
            experiment_id,
            variant_id,
            ranking_score,
            component_scores,
            reasons
          ) VALUES ${values}
        `,
        params,
      );
    } catch (error) {
      console.warn('Failed to log ranking events:', error);
    }
  }
}

export const rankingService = new RankingService();
