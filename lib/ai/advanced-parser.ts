// Advanced AI Query Parser with 100+ Feature Analysis
// Uses AI to extract detailed requirements from natural language

export interface EnhancedSearchQuery {
  // Basic Requirements (existing)
  bedrooms?: number;
  bathrooms?: number;
  priceRange?: { min: number; max: number };
  district?: number;
  districts?: number[];
  
  // Lifestyle Compatibility
  lifestyle: {
    quietPreference: 'very-quiet' | 'moderate' | 'social' | 'any';
    workFromHome: boolean;
    petsOwned: string[]; // ['cat', 'small-dog', 'large-dog']
    smokingHabits: 'non-smoker' | 'occasional' | 'regular';
    guestFrequency: 'rare' | 'occasional' | 'frequent';
    partyAllowed: boolean;
    sublettingInterest: boolean;
  };
  
  // Amenity Priorities (100+ features)
  amenityPriorities: {
    essential: string[]; // Must have
    important: string[]; // Nice to have
    dealbreakers: string[]; // Must NOT have
  };
  
  // Accessibility Needs
  accessibility: {
    wheelchairRequired: boolean;
    elevatorRequired: boolean;
    groundFloorPreferred: boolean;
    stepFreeEntrance: boolean;
    wideDoorways: boolean;
    accessibleBathroom: boolean;
  };
  
  // Commute Requirements
  commute: {
    destinations: Array<{
      name: string;
      lat?: number;
      lng?: number;
      importance: 'essential' | 'important' | 'nice-to-have';
    }>;
    maxCommuteMinutes: number;
    transportModes: string[]; // ['metro', 'tram', 'bike', 'walk', 'car']
  };
  
  // Timeline
  timeline: {
    moveInDate?: Date;
    leaseDurationMonths: number;
    flexibility: 'strict' | 'flexible' | 'very-flexible';
  };
  
  // Legal/Admin Requirements
  legal: {
    needsRegistration: boolean; // For visa/residence permit
    hasGuarantor: boolean;
    hasEmploymentProof: boolean;
    canProvideCreditCheck: boolean;
    documentsReady: string[];
  };
  
  // Personal Context
  personalContext: {
    age?: number;
    ageRange?: string; // '18-25', '25-35', etc
    occupation: string; // 'student', 'professional', 'freelancer', 'retired'
    university?: string;
    company?: string;
    hasPets: boolean;
    hasChildren: boolean;
    lifestyle: string; // 'quiet', 'social', 'active', 'homebody'
    hobbies: string[];
  };
  
  // Budget Flexibility
  budgetContext: {
    utilitiesIncludedPreference: boolean;
    willingToPayDeposit: number; // in months
    budgetFlexibility: 'strict' | 'somewhat-flexible' | 'flexible';
  };
  
  // Building Preferences
  buildingPreferences: {
    preferredAge: 'new' | 'renovated' | 'any';
    viewImportance: 'not-important' | 'nice' | 'very-important';
    soundproofingImportance: 'not-important' | 'important' | 'critical';
    balconyRequired: boolean;
    storageRequired: boolean;
    parkingRequired: boolean;
  };
}

/**
 * Parse natural language query into structured EnhancedSearchQuery
 * This is a simplified version - in production, use OpenAI/Claude API
 */
export function parseAdvancedQuery(rawQuery: string): EnhancedSearchQuery {
  const query = rawQuery.toLowerCase();
  
  // Initialize with defaults
  const result: EnhancedSearchQuery = {
    lifestyle: {
      quietPreference: 'any',
      workFromHome: false,
      petsOwned: [],
      smokingHabits: 'non-smoker',
      guestFrequency: 'occasional',
      partyAllowed: true,
      sublettingInterest: false,
    },
    amenityPriorities: {
      essential: [],
      important: [],
      dealbreakers: [],
    },
    accessibility: {
      wheelchairRequired: false,
      elevatorRequired: false,
      groundFloorPreferred: false,
      stepFreeEntrance: false,
      wideDoorways: false,
      accessibleBathroom: false,
    },
    commute: {
      destinations: [],
      maxCommuteMinutes: 45,
      transportModes: ['metro', 'tram', 'bus'],
    },
    timeline: {
      leaseDurationMonths: 12,
      flexibility: 'flexible',
    },
    legal: {
      needsRegistration: false,
      hasGuarantor: false,
      hasEmploymentProof: false,
      canProvideCreditCheck: false,
      documentsReady: [],
    },
    personalContext: {
      occupation: 'unknown',
      hasPets: false,
      hasChildren: false,
      lifestyle: 'moderate',
      hobbies: [],
    },
    budgetContext: {
      utilitiesIncludedPreference: true,
      willingToPayDeposit: 2,
      budgetFlexibility: 'somewhat-flexible',
    },
    buildingPreferences: {
      preferredAge: 'any',
      viewImportance: 'nice',
      soundproofingImportance: 'important',
      balconyRequired: false,
      storageRequired: false,
      parkingRequired: false,
    },
  };

  // 1. OCCUPATION DETECTION
  if (/student|university|college|bachelor|master|phd/i.test(query)) {
    result.personalContext.occupation = 'student';
    result.timeline.leaseDurationMonths = 10; // Academic year
  } else if (/professional|work|job|career|employee|engineer|doctor|lawyer/i.test(query)) {
    result.personalContext.occupation = 'professional';
  } else if (/freelance|remote work|digital nomad/i.test(query)) {
    result.personalContext.occupation = 'freelancer';
    result.lifestyle.workFromHome = true;
  }

  // 2. LIFESTYLE & QUIET PREFERENCE
  if (/quiet|peaceful|silent|calm|tranquil/i.test(query)) {
    result.lifestyle.quietPreference = 'very-quiet';
    result.amenityPriorities.important.push('soundproofing', 'courtyard_view');
  } else if (/social|party|loud|active nightlife/i.test(query)) {
    result.lifestyle.quietPreference = 'social';
    result.lifestyle.partyAllowed = true;
  }

  // 3. WORK FROM HOME
  if (/work from home|remote work|home office|workspace/i.test(query)) {
    result.lifestyle.workFromHome = true;
    result.amenityPriorities.essential.push('wifi', 'desk', 'quiet');
    result.buildingPreferences.soundproofingImportance = 'critical';
  }

  // 4. PETS
  if (/cat|dog|pet/i.test(query)) {
    result.lifestyle.petsOwned = [];
    if (/cat/i.test(query)) result.lifestyle.petsOwned.push('cat');
    if (/dog|puppy/i.test(query)) result.lifestyle.petsOwned.push('dog');
    result.personalContext.hasPets = true;
    result.amenityPriorities.essential.push('pet_friendly');
  }

  // 5. SMOKING
  if (/non-smoker|no smoking/i.test(query)) {
    result.lifestyle.smokingHabits = 'non-smoker';
    result.amenityPriorities.dealbreakers.push('smoking_allowed');
  } else if (/smoker|smoking allowed/i.test(query)) {
    result.lifestyle.smokingHabits = 'regular';
    result.amenityPriorities.essential.push('smoking_allowed', 'balcony');
  }

  // 6. ACCESSIBILITY
  if (/wheelchair|disabled|accessibility|mobility/i.test(query)) {
    result.accessibility.wheelchairRequired = true;
    result.accessibility.elevatorRequired = true;
    result.accessibility.stepFreeEntrance = true;
    result.accessibility.wideDoorways = true;
    result.accessibility.accessibleBathroom = true;
    result.amenityPriorities.essential.push('wheelchair_accessible', 'elevator');
  } else if (/elevator|lift/i.test(query)) {
    result.accessibility.elevatorRequired = true;
    result.amenityPriorities.important.push('elevator');
  } else if (/ground floor/i.test(query)) {
    result.accessibility.groundFloorPreferred = true;
  }

  // 7. ESSENTIAL AMENITIES
  const amenityMap: Record<string, string> = {
    'washing machine': 'washing_machine',
    'dishwasher': 'dishwasher',
    'air conditioning|a/c|ac': 'air_conditioning',
    'wifi|internet': 'wifi',
    'parking': 'parking',
    'balcony': 'balcony',
    'storage|cellar': 'storage',
    'furnished': 'furnished',
    'gym': 'gym',
    'security|alarm': 'security_system',
  };

  for (const [pattern, amenity] of Object.entries(amenityMap)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(query)) {
      if (/must have|need|require|essential/i.test(query)) {
        result.amenityPriorities.essential.push(amenity);
      } else {
        result.amenityPriorities.important.push(amenity);
      }
    }
  }

  // 8. BEDROOMS & PRICE (reuse existing logic)
  const bedroomMatch = query.match(/(\d+)\s*(bed|bedroom|br)/);
  if (bedroomMatch) {
    result.bedrooms = parseInt(bedroomMatch[1]);
  }

  const priceMatch = query.match(/(\d+)[\s,-]*(\d*)\s*k?\s*(huf|forint)?/i);
  if (priceMatch) {
    const price = parseInt(priceMatch[1]) * (priceMatch[1].length <= 3 ? 1000 : 1);
    result.priceRange = { min: 0, max: price };
  }

  // 9. UNIVERSITIES (for commute)
  const universities: Record<string, { lat: number; lng: number }> = {
    'elte': { lat: 47.4814, lng: 19.0625 },
    'bme': { lat: 47.4735, lng: 19.0558 },
    'corvinus': { lat: 47.4859, lng: 19.0560 },
    'semmelweis': { lat: 47.4881, lng: 19.0614 },
  };

  for (const [uni, coords] of Object.entries(universities)) {
    if (query.includes(uni)) {
      result.commute.destinations.push({
        name: uni.toUpperCase(),
        ...coords,
        importance: 'essential',
      });
    }
  }

  // 10. BUDGET FLEXIBILITY
  if (/tight budget|cheap|affordable|limited budget/i.test(query)) {
    result.budgetContext.budgetFlexibility = 'strict';
    result.budgetContext.utilitiesIncludedPreference = true;
  } else if (/flexible budget|can pay more/i.test(query)) {
    result.budgetContext.budgetFlexibility = 'flexible';
  }

  // 11. LEGAL REQUIREMENTS
  if (/visa|residence permit|registration|address card/i.test(query)) {
    result.legal.needsRegistration = true;
    result.amenityPriorities.essential.push('registration_possible');
  }

  // 12. TIMELINE
  if (/immediately|asap|urgent/i.test(query)) {
    result.timeline.flexibility = 'strict';
    result.timeline.moveInDate = new Date();
  } else if (/next month|soon/i.test(query)) {
    result.timeline.flexibility = 'flexible';
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    result.timeline.moveInDate = nextMonth;
  }

  const leaseMatch = query.match(/(\d+)\s*month/i);
  if (leaseMatch) {
    result.timeline.leaseDurationMonths = parseInt(leaseMatch[1]);
  }

  return result;
}

/**
 * In production, replace this with OpenAI/Claude API call:
 * 
 * async function parseWithLLM(query: string): Promise<EnhancedSearchQuery> {
 *   const response = await openai.chat.completions.create({
 *     model: "gpt-4",
 *     messages: [{
 *       role: "system",
 *       content: "Extract apartment search requirements from user query. Return JSON matching EnhancedSearchQuery schema."
 *     }, {
 *       role: "user",
 *       content: query
 *     }],
 *     response_format: { type: "json_object" }
 *   });
 *   
 *   return JSON.parse(response.choices[0].message.content);
 * }
 */
