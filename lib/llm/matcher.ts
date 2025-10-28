// FILE: lib/llm/matcher.ts

import { Apartment } from '@/types/apartment';
import { SearchQuery, ApartmentMatch } from '@/types/search';

/**
 * Score an apartment against search criteria (0-100)
 */
export function scoreApartment(
  apartment: Apartment,
  query: SearchQuery
): ApartmentMatch {
  let totalScore = 0;
  const weights = {
    price: 0.3,
    location: 0.3,
    rooms: 0.25,
    amenities: 0.15,
  };

  // Score breakdown
  const breakdown = {
    price: scorePriceMatch(apartment, query),
    location: scoreLocationMatch(apartment, query),
    rooms: scoreRoomsMatch(apartment, query),
    amenities: scoreAmenitiesMatch(apartment, query),
  };

  // Calculate weighted total
  totalScore =
    breakdown.price * weights.price +
    breakdown.location * weights.location +
    breakdown.rooms * weights.rooms +
    breakdown.amenities * weights.amenities;

  // Generate explanation
  const { pros, cons, explanation } = generateExplanation(apartment, query, breakdown);

  return {
    apartmentId: apartment.id,
    score: Math.round(totalScore),
    matchBreakdown: breakdown,
    explanation,
    pros,
    cons,
  };
}

/**
 * Score price match (0-100)
 */
function scorePriceMatch(apartment: Apartment, query: SearchQuery): number {
  if (!query.priceRange) return 50; // Neutral if no preference

  const price = apartment.price_huf;
  const { min, max } = query.priceRange;

  // Perfect match if within range
  if (min && max) {
    if (price >= min && price <= max) return 100;
    const midpoint = (min + max) / 2;
    const tolerance = (max - min) / 2;
    const deviation = Math.abs(price - midpoint);
    return Math.max(0, 100 - (deviation / tolerance) * 50);
  }

  if (max) {
    if (price <= max) return 100;
    const overage = price - max;
    const penalty = Math.min(100, (overage / max) * 100);
    return Math.max(0, 100 - penalty);
  }

  if (min) {
    if (price >= min) return 100;
    const underage = min - price;
    const penalty = Math.min(100, (underage / min) * 100);
    return Math.max(0, 100 - penalty);
  }

  return 50;
}

/**
 * Score location match (0-100)
 */
function scoreLocationMatch(apartment: Apartment, query: SearchQuery): number {
  if (!query.location) return 50;

  let score = 50;

  // District match
  if (query.location.district && apartment.district) {
    if (query.location.district === apartment.district) {
      score = 100;
    } else {
      // Penalize by distance between districts
      const districtDiff = Math.abs(query.location.district - apartment.district);
      score = Math.max(0, 100 - districtDiff * 15);
    }
  }

  // Landmark proximity (would need actual distance calculation)
  if (query.location.near && apartment.address) {
    const addressLower = apartment.address.toLowerCase();
    const nearLower = query.location.near.toLowerCase();
    
    if (addressLower.includes(nearLower)) {
      score = Math.max(score, 90);
    }
  }

  return score;
}

/**
 * Score rooms match (0-100)
 */
function scoreRoomsMatch(apartment: Apartment, query: SearchQuery): number {
  let score = 50;
  let matches = 0;
  let checks = 0;

  // Bedrooms
  if (query.bedrooms !== undefined) {
    checks++;
    if (apartment.bedrooms === query.bedrooms) {
      matches++;
      score += 25;
    } else if (apartment.bedrooms && apartment.bedrooms > query.bedrooms) {
      // More rooms is slightly positive
      score += 15;
      matches += 0.5;
    } else {
      // Fewer rooms is negative
      score -= 20;
    }
  }

  // Bathrooms
  if (query.bathrooms !== undefined) {
    checks++;
    if (apartment.bathrooms === query.bathrooms) {
      matches++;
      score += 25;
    } else if (apartment.bathrooms && apartment.bathrooms > query.bathrooms) {
      score += 10;
      matches += 0.3;
    } else {
      score -= 15;
    }
  }

  // If no specific requirements, return neutral
  if (checks === 0) return 50;

  return Math.max(0, Math.min(100, score));
}

/**
 * Score amenities match (0-100)
 */
function scoreAmenitiesMatch(apartment: Apartment, query: SearchQuery): number {
  if (!query.requirements || query.requirements.length === 0) {
    return 50; // Neutral if no requirements
  }

  let matchCount = 0;
  const totalRequirements = query.requirements.length;

  // Check each requirement (would need proper database fields)
  query.requirements.forEach((req) => {
    // Example: check if apartment has the required feature
    // This would need to be connected to actual apartment data
    if (req === 'furnished' && apartment.furnishing === 'furnished') {
      matchCount++;
    }
    // Add more checks as needed
  });

  return (matchCount / totalRequirements) * 100;
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  apartment: Apartment,
  query: SearchQuery,
  breakdown: { price: number; location: number; rooms: number; amenities: number }
): { explanation: string; pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];

  // Price analysis
  if (breakdown.price >= 80) {
    pros.push(`Within your budget at ${apartment.price_huf.toLocaleString()} HUF/month`);
  } else if (breakdown.price < 50) {
    cons.push(`Above budget at ${apartment.price_huf.toLocaleString()} HUF/month`);
  }

  // Location analysis
  if (breakdown.location >= 80) {
    if (apartment.district) {
      pros.push(`Located in District ${apartment.district}`);
    }
  } else if (breakdown.location < 50) {
    cons.push('Location may not match your preferences');
  }

  // Rooms analysis
  if (query.bedrooms && apartment.bedrooms) {
    if (apartment.bedrooms === query.bedrooms) {
      pros.push(`Has ${apartment.bedrooms} bedroom(s) as requested`);
    } else if (apartment.bedrooms > query.bedrooms) {
      pros.push(`Extra space with ${apartment.bedrooms} bedrooms`);
    } else {
      cons.push(`Only ${apartment.bedrooms} bedroom(s), you wanted ${query.bedrooms}`);
    }
  }

  // Elevator consideration
  if (apartment.elevator === 'no' && apartment.bedrooms && apartment.bedrooms > 2) {
    cons.push('No elevator available');
  }

  // Furnishing
  if (apartment.furnishing) {
    pros.push(`${apartment.furnishing} apartment`);
  }

  const explanation =
    pros.length > 0
      ? `Good match: ${pros[0]}`
      : 'Partial match with some considerations';

  return { explanation, pros, cons };
}

/**
 * Rank apartments by score
 */
export function rankApartments(
  apartments: Apartment[],
  query: SearchQuery
): ApartmentMatch[] {
  const scored = apartments.map((apt) => scoreApartment(apt, query));
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored;
}

/**
 * Filter apartments by minimum score threshold
 */
export function filterByScore(
  matches: ApartmentMatch[],
  minScore: number = 50
): ApartmentMatch[] {
  return matches.filter((match) => match.score >= minScore);
}
