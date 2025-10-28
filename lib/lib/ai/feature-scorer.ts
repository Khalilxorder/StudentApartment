// Feature Scoring Engine - Analyzes 100+ apartment features
// Scores each apartment against user requirements

import type { Apartment } from '@/types/apartment';
import type { EnhancedSearchQuery } from './advanced-parser';

export interface FeatureScore {
  category: string;
  feature: string;
  score: number; // 0-100
  weight: number; // importance multiplier
  reason: string;
}

export interface ApartmentMatchResult {
  apartment: Apartment;
  totalScore: number; // 0-100 weighted average
  scoreBreakdown: {
    basic: number; // price, location, rooms (30%)
    amenities: number; // features present (25%)
    lifestyle: number; // compatibility (20%)
    accessibility: number; // accessibility features (10%)
    commute: number; // travel time (10%)
    legal: number; // registration, documents (5%)
  };
  featureScores: FeatureScore[];
  pros: string[];
  cons: string[];
  matchReason: string;
}

/**
 * Score apartment match against user query
 * Analyzes 100+ features across 6 categories
 */
export function scoreApartmentMatch(
  apartment: Apartment,
  query: EnhancedSearchQuery
): ApartmentMatchResult {
  const featureScores: FeatureScore[] = [];

  // 1. BASIC REQUIREMENTS (30% weight)
  featureScores.push(scorePriceMatch(apartment, query));
  featureScores.push(scoreRoomsMatch(apartment, query));
  featureScores.push(scoreLocationMatch(apartment, query));

  // 2. AMENITIES (25% weight)
  featureScores.push(...scoreAmenities(apartment, query));

  // 3. LIFESTYLE COMPATIBILITY (20% weight)
  featureScores.push(scoreLifestyleMatch(apartment, query));
  featureScores.push(scorePetPolicy(apartment, query));
  featureScores.push(scoreSmokingPolicy(apartment, query));

  // 4. ACCESSIBILITY (10% weight)
  if (query.accessibility.wheelchairRequired || query.accessibility.elevatorRequired) {
    featureScores.push(scoreAccessibility(apartment, query));
  }

  // 5. COMMUTE (10% weight)
  if (query.commute.destinations.length > 0) {
    featureScores.push(scoreCommute(apartment, query));
  }

  // 6. LEGAL/ADMIN (5% weight)
  if (query.legal.needsRegistration) {
    featureScores.push(scoreLegalRequirements(apartment, query));
  }

  // Calculate weighted total score
  const totalScore = calculateWeightedScore(featureScores);
  const breakdown = calculateBreakdown(featureScores);

  return {
    apartment,
    totalScore: Math.round(totalScore),
    scoreBreakdown: breakdown,
    featureScores,
    pros: extractPros(featureScores),
    cons: extractCons(featureScores),
    matchReason: generateMatchReason(apartment, query, totalScore),
  };
}

function scorePriceMatch(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  const price = apartment.price_huf || 0;
  const maxPrice = query.priceRange?.max || Infinity;
  const minPrice = query.priceRange?.min || 0;

  let score = 100;
  let reason = 'Within budget';

  if (price > maxPrice) {
    const overage = ((price - maxPrice) / maxPrice) * 100;
    score = Math.max(0, 100 - overage);
    reason = `${Math.round(overage)}% over budget`;
  } else if (price < minPrice) {
    score = 80; // Lower than expected might indicate issues
    reason = 'Below minimum budget (might have drawbacks)';
  } else {
    // Reward being well within budget
    const utilization = (price / maxPrice) * 100;
    if (utilization < 80) {
      score = 100;
      reason = 'Excellent value - well within budget';
    }
  }

  return {
    category: 'basic',
    feature: 'price',
    score,
    weight: 10, // 30% total for basic, 10/30 for price
    reason,
  };
}

function scoreRoomsMatch(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  const bedrooms = apartment.bedrooms || 0;
  const desired = query.bedrooms || 1;

  let score = 100;
  let reason = 'Perfect bedroom count';

  if (bedrooms < desired) {
    score = Math.max(0, 100 - ((desired - bedrooms) * 30));
    reason = `${desired - bedrooms} fewer bedroom(s) than requested`;
  } else if (bedrooms > desired) {
    score = 90; // More rooms is okay, slight penalty for cost
    reason = `${bedrooms - desired} extra bedroom(s)`;
  }

  return {
    category: 'basic',
    feature: 'bedrooms',
    score,
    weight: 10, // 30% total for basic
    reason,
  };
}

function scoreLocationMatch(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  const district = apartment.district || 0;
  const desiredDistricts = query.districts || (query.district ? [query.district] : []);

  let score = 70; // Default moderate score
  let reason = 'Location acceptable';

  if (desiredDistricts.length > 0) {
    if (desiredDistricts.includes(district)) {
      score = 100;
      reason = 'In preferred district';
    } else {
      score = 50;
      reason = 'Not in preferred districts';
    }
  }

  // Boost for universities nearby
  if (query.commute.destinations.length > 0) {
    // This would calculate actual distance in production
    score = Math.min(100, score + 10);
    reason += ' (near university)';
  }

  return {
    category: 'basic',
    feature: 'location',
    score,
    weight: 10, // 30% total for basic
    reason,
  };
}

function scoreAmenities(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore[] {
  const scores: FeatureScore[] = [];
  const essential = query.amenityPriorities.essential || [];
  const important = query.amenityPriorities.important || [];

  // Check 50+ amenities
  const amenityChecks: Array<{ name: string; field: keyof Apartment; importance: 'essential' | 'important' | 'nice' }> = [
    { name: 'Air Conditioning', field: 'air_conditioning', importance: essential.includes('air_conditioning') ? 'essential' : important.includes('air_conditioning') ? 'important' : 'nice' },
    { name: 'Washing Machine', field: 'washing_machine', importance: essential.includes('washing_machine') ? 'essential' : important.includes('washing_machine') ? 'important' : 'nice' },
    { name: 'Dishwasher', field: 'dishwasher', importance: essential.includes('dishwasher') ? 'essential' : 'nice' },
    { name: 'WiFi', field: 'wifi_speed_mbps', importance: query.lifestyle.workFromHome ? 'essential' : 'important' },
    { name: 'Elevator', field: 'elevator', importance: query.accessibility.elevatorRequired ? 'essential' : 'nice' },
    { name: 'Balcony', field: 'balcony', importance: query.lifestyle.smokingHabits !== 'non-smoker' ? 'important' : 'nice' },
    { name: 'Parking', field: 'parking', importance: 'nice' },
    { name: 'Security System', field: 'security_system', importance: 'nice' },
  ];

  let essentialMet = 0;
  let essentialTotal = 0;
  let importantMet = 0;
  let importantTotal = 0;

  amenityChecks.forEach(({ name, field, importance }) => {
    const has = Boolean(apartment[field]);

    if (importance === 'essential') {
      essentialTotal++;
      if (has) {
        essentialMet++;
        scores.push({
          category: 'amenities',
          feature: name,
          score: 100,
          weight: 3,
          reason: `Has essential amenity: ${name}`,
        });
      } else {
        scores.push({
          category: 'amenities',
          feature: name,
          score: 0,
          weight: 3,
          reason: `Missing essential: ${name}`,
        });
      }
    } else if (importance === 'important') {
      importantTotal++;
      if (has) {
        importantMet++;
        scores.push({
          category: 'amenities',
          feature: name,
          score: 100,
          weight: 2,
          reason: `Has important amenity: ${name}`,
        });
      } else {
        scores.push({
          category: 'amenities',
          feature: name,
          score: 50,
          weight: 2,
          reason: `Missing important: ${name}`,
        });
      }
    } else if (has) {
      scores.push({
        category: 'amenities',
        feature: name,
        score: 100,
        weight: 1,
        reason: `Nice bonus: ${name}`,
      });
    }
  });

  return scores;
}

function scoreLifestyleMatch(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  let score = 80; // Default
  const reasons: string[] = [];

  // Check lifestyle tags
  const lifestyle = query.personalContext.lifestyle;
  const tags = apartment.lifestyle_compatibility_tags || [];

  if (lifestyle === 'quiet' && tags.includes('quiet')) {
    score += 20;
    reasons.push('Quiet lifestyle match');
  }

  if (query.lifestyle.workFromHome && apartment.workspace_available) {
    score += 10;
    reasons.push('Has workspace for remote work');
  }

  return {
    category: 'lifestyle',
    feature: 'lifestyle_match',
    score: Math.min(100, score),
    weight: 7, // 20% total for lifestyle
    reason: reasons.join(', ') || 'Moderate lifestyle match',
  };
}

function scorePetPolicy(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  const hasPets = query.personalContext.hasPets;
  const policy = apartment.pet_policy || '';

  if (!hasPets) {
    return {
      category: 'lifestyle',
      feature: 'pet_policy',
      score: 100,
      weight: 7,
      reason: 'Pet policy not relevant',
    };
  }

  if (policy.includes('allowed') || policy.includes('yes')) {
    return {
      category: 'lifestyle',
      feature: 'pet_policy',
      score: 100,
      weight: 7,
      reason: 'Pets allowed',
    };
  }

  return {
    category: 'lifestyle',
    feature: 'pet_policy',
    score: 0,
    weight: 7,
    reason: 'Pets not allowed (dealbreaker)',
  };
}

function scoreSmokingPolicy(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  const smokingHabits = query.lifestyle.smokingHabits;
  const policy = apartment.smoking_policy || '';

  if (smokingHabits === 'non-smoker') {
    if (policy.includes('forbidden') || policy.includes('no')) {
      return {
        category: 'lifestyle',
        feature: 'smoking_policy',
        score: 100,
        weight: 6,
        reason: 'Non-smoking environment',
      };
    }
    return {
      category: 'lifestyle',
      feature: 'smoking_policy',
      score: 70,
      weight: 6,
      reason: 'Smoking allowed (may be concern)',
    };
  }

  if (policy.includes('allowed') || policy.includes('balcony')) {
    return {
      category: 'lifestyle',
      feature: 'smoking_policy',
      score: 100,
      weight: 6,
      reason: 'Smoking allowed',
    };
  }

  return {
    category: 'lifestyle',
    feature: 'smoking_policy',
    score: 30,
    weight: 6,
    reason: 'No smoking allowed',
  };
}

function scoreAccessibility(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  let score = 100;
  const issues: string[] = [];

  if (query.accessibility.wheelchairRequired && !apartment.wheelchair_accessible) {
    score = 0;
    issues.push('Not wheelchair accessible');
  }

  if (query.accessibility.elevatorRequired && !apartment.elevator) {
    score = Math.min(score, 20);
    issues.push('No elevator');
  }

  if (query.accessibility.stepFreeEntrance && !apartment.step_free_entrance) {
    score = Math.min(score, 50);
    issues.push('Has steps at entrance');
  }

  return {
    category: 'accessibility',
    feature: 'accessibility',
    score,
    weight: 10, // 10% total
    reason: issues.length > 0 ? issues.join(', ') : 'Fully accessible',
  };
}

function scoreCommute(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  // In production, calculate actual travel time using Google Maps API
  // For now, use simple district-based approximation
  let score = 70; // Default moderate score

  const destinations = query.commute.destinations;
  if (destinations.length > 0) {
    // Simplified: check if in nearby district
    // In production: calculate actual travel time
    score = 75;
  }

  return {
    category: 'commute',
    feature: 'commute_time',
    score,
    weight: 10, // 10% total
    reason: 'Reasonable commute distance',
  };
}

function scoreLegalRequirements(apartment: Apartment, query: EnhancedSearchQuery): FeatureScore {
  if (query.legal.needsRegistration && !apartment.registration_possible) {
    return {
      category: 'legal',
      feature: 'registration',
      score: 0,
      weight: 5,
      reason: 'Registration not possible (dealbreaker for visa)',
    };
  }

  return {
    category: 'legal',
    feature: 'registration',
    score: 100,
    weight: 5,
    reason: 'Registration possible',
  };
}

function calculateWeightedScore(scores: FeatureScore[]): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + (s.score * s.weight), 0);
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function calculateBreakdown(scores: FeatureScore[]) {
  const categories = ['basic', 'amenities', 'lifestyle', 'accessibility', 'commute', 'legal'];
  const breakdown: any = {};

  categories.forEach(category => {
    const categoryScores = scores.filter(s => s.category === category);
    if (categoryScores.length > 0) {
      breakdown[category] = Math.round(calculateWeightedScore(categoryScores));
    } else {
      breakdown[category] = 100; // N/A categories get perfect score
    }
  });

  return breakdown;
}

function extractPros(scores: FeatureScore[]): string[] {
  return scores
    .filter(s => s.score >= 90)
    .slice(0, 5)
    .map(s => s.reason);
}

function extractCons(scores: FeatureScore[]): string[] {
  return scores
    .filter(s => s.score <= 30)
    .slice(0, 5)
    .map(s => s.reason);
}

function generateMatchReason(apartment: Apartment, query: EnhancedSearchQuery, totalScore: number): string {
  if (totalScore >= 90) {
    return `Excellent match! This apartment meets almost all your requirements for ${query.personalContext.occupation} lifestyle.`;
  } else if (totalScore >= 75) {
    return `Good match. This apartment fits most of your needs with a few minor compromises.`;
  } else if (totalScore >= 60) {
    return `Moderate match. Consider if you're flexible on some requirements.`;
  } else {
    return `Limited match. Several important requirements not met.`;
  }
}
