// FILE: lib/llm/query-parser.ts

import { ollamaClient } from './client';
import { buildQueryUnderstandingPrompt } from './prompts';
import { SearchQuery } from '@/types/search';

/**
 * Parse natural language query into structured SearchQuery
 */
export async function parseSearchQuery(rawQuery: string): Promise<SearchQuery> {
  try {
    const prompt = buildQueryUnderstandingPrompt(rawQuery);
    
    const structured = await ollamaClient.generateJSON<Partial<SearchQuery>>(prompt, {
      temperature: 0.3,
      max_tokens: 512,
    });

    return {
      rawQuery,
      ...structured,
    };
  } catch (error) {
    console.error('Query parsing error:', error);
    
    // Fallback: Basic regex-based parsing
    return fallbackParse(rawQuery);
  }
}

/**
 * Fallback parser using regex when LLM is unavailable
 */
function fallbackParse(query: string): SearchQuery {
  const lowercaseQuery = query.toLowerCase();
  
  // Extract bedrooms
  const bedroomMatch = lowercaseQuery.match(/(\d+)\s*(bedroom|br|bed)/);
  const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : undefined;
  
  // Extract bathrooms
  const bathroomMatch = lowercaseQuery.match(/(\d+)\s*(bathroom|bath)/);
  const bathrooms = bathroomMatch ? parseInt(bathroomMatch[1]) : undefined;
  
  // Extract price
  const priceMatch = lowercaseQuery.match(/(\d+)(k|000)?\s*(huf|forint)?/);
  let maxPrice: number | undefined;
  if (priceMatch) {
    const amount = parseInt(priceMatch[1]);
    maxPrice = priceMatch[2] === 'k' ? amount * 1000 : amount;
  }
  
  // Detect price keywords
  if (lowercaseQuery.includes('cheap') || lowercaseQuery.includes('budget')) {
    maxPrice = 150000;
  }
  
  // Extract district
  const districtMatch = lowercaseQuery.match(/district\s*([ivxIVX\d]+)/i);
  let district: number | undefined;
  if (districtMatch) {
    const districtStr = districtMatch[1];
    district = romanToNumber(districtStr) || parseInt(districtStr);
  }
  
  // Extract requirements
  const requirements: string[] = [];
  if (lowercaseQuery.includes('pet')) requirements.push('pet_friendly');
  if (lowercaseQuery.includes('furnished')) requirements.push('furnished');
  if (lowercaseQuery.includes('parking')) requirements.push('parking');
  
  // Extract location mentions
  const locationKeywords = [
    'semmelweis', 'corvinus', 'bme', 'elte',
    'boráros', 'deák', 'blaha', 'keleti',
    'downtown', 'center', 'centre'
  ];
  
  const near = locationKeywords.find(keyword => 
    lowercaseQuery.includes(keyword)
  );
  
  return {
    rawQuery: query,
    bedrooms,
    bathrooms,
    priceRange: maxPrice ? { max: maxPrice } : undefined,
    location: district || near ? { district, near } : undefined,
    requirements: requirements.length > 0 ? requirements : undefined,
    priorities: ['price', 'location'], // Default priorities
  };
}

/**
 * Convert Roman numerals to numbers
 */
function romanToNumber(roman: string): number | null {
  const romanMap: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15,
    'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20,
    'XXI': 21, 'XXII': 22, 'XXIII': 23
  };
  
  return romanMap[roman.toUpperCase()] || null;
}

/**
 * Validate and clean search query
 */
export function validateSearchQuery(query: SearchQuery): SearchQuery {
  // Ensure price range is reasonable
  if (query.priceRange) {
    if (query.priceRange.min && query.priceRange.min < 0) {
      query.priceRange.min = 0;
    }
    if (query.priceRange.max && query.priceRange.max > 1000000) {
      query.priceRange.max = 1000000;
    }
  }
  
  // Ensure district is valid (1-23)
  if (query.location?.district) {
    if (query.location.district < 1 || query.location.district > 23) {
      delete query.location.district;
    }
  }
  
  // Ensure bedroom/bathroom counts are reasonable
  if (query.bedrooms && (query.bedrooms < 0 || query.bedrooms > 10)) {
    query.bedrooms = undefined;
  }
  if (query.bathrooms && (query.bathrooms < 0 || query.bathrooms > 5)) {
    query.bathrooms = undefined;
  }
  
  return query;
}
