// Personality Archetypes
// Stub implementation for personality archetypes

export interface Archetype {
  id: string;
  name: string;
  emoji: string;
  description: string;
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  preferences: {
    location: string[];
    amenities: string[];
    lifestyle: string[];
  };
}

export const PERSONALITY_ARCHETYPES: Archetype[] = [
  {
    id: 'creative-explorer',
    name: 'Creative Explorer',
    emoji: '🎨',
    description: 'Adventurous and open-minded, you seek unique experiences and creative spaces.',
    traits: {
      openness: 0.8,
      conscientiousness: 0.4,
      extraversion: 0.6,
      agreeableness: 0.7,
      neuroticism: 0.3
    },
    preferences: {
      location: ['urban', 'artsy', 'diverse'],
      amenities: ['workspace', 'community-events', 'unique-features'],
      lifestyle: ['social', 'creative', 'flexible']
    }
  },
  {
    id: 'organized-planner',
    name: 'Organized Planner',
    emoji: '📋',
    description: 'Structured and reliable, you value efficiency and well-maintained spaces.',
    traits: {
      openness: 0.5,
      conscientiousness: 0.9,
      extraversion: 0.4,
      agreeableness: 0.6,
      neuroticism: 0.4
    },
    preferences: {
      location: ['quiet', 'safe', 'convenient'],
      amenities: ['modern-appliances', 'security', 'cleanliness'],
      lifestyle: ['routine', 'productive', 'organized']
    }
  },
  {
    id: 'balanced-individual',
    name: 'Balanced Individual',
    emoji: '⚖️',
    description: 'Well-rounded and adaptable, you seek harmony between work, social life, and relaxation.',
    traits: {
      openness: 0.6,
      conscientiousness: 0.6,
      extraversion: 0.5,
      agreeableness: 0.8,
      neuroticism: 0.4
    },
    preferences: {
      location: ['residential', 'accessible', 'community-oriented'],
      amenities: ['comfortable', 'practical', 'social-spaces'],
      lifestyle: ['balanced', 'social', 'comfortable']
    }
  }
];

export function getArchetypeFromTraits(traits: any): Archetype {
  // Simple matching logic - return the closest archetype
  const archetypes = PERSONALITY_ARCHETYPES;
  let bestMatch = archetypes[0];
  let bestScore = 0;

  for (const archetype of archetypes) {
    let score = 0;
    for (const [trait, value] of Object.entries(archetype.traits)) {
      const userValue = traits[trait] || 0.5;
      score += 1 - Math.abs(userValue - value);
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = archetype;
    }
  }

  return bestMatch;
}

export function getRecommendationsForArchetype(archetypeId: string, apartments: any[]): any[] {
  // Stub implementation - return apartments as-is
  return apartments;
}

export function detectArchetypeFromStory(story: string): Archetype {
  // Simple keyword-based detection
  const storyLower = story.toLowerCase();
  
  if (storyLower.includes('creative') || storyLower.includes('art') || storyLower.includes('explore')) {
    return PERSONALITY_ARCHETYPES.find(a => a.id === 'creative-explorer') || PERSONALITY_ARCHETYPES[0];
  } else if (storyLower.includes('organized') || storyLower.includes('plan') || storyLower.includes('structure')) {
    return PERSONALITY_ARCHETYPES.find(a => a.id === 'organized-planner') || PERSONALITY_ARCHETYPES[1];
  } else {
    return PERSONALITY_ARCHETYPES.find(a => a.id === 'balanced-individual') || PERSONALITY_ARCHETYPES[2];
  }
}

export function getArchetypeMatchScore(archetype: Archetype, apartmentFeatures: string[]): { score: number; reasons: string[]; concerns: string[] } {
  // Simple matching based on preferences
  let score = 0;
  const reasons: string[] = [];
  const concerns: string[] = [];
  const featuresLower = apartmentFeatures.map(f => f.toLowerCase());
  
  // Check location preferences
  for (const location of archetype.preferences.location) {
    if (featuresLower.some(f => f.includes(location))) {
      score += 0.3;
      reasons.push(`Matches your preferred ${location} location`);
    } else {
      concerns.push(`May not be in your preferred ${location} area`);
    }
  }
  
  // Check amenity preferences
  for (const amenity of archetype.preferences.amenities) {
    if (featuresLower.some(f => f.includes(amenity.replace('-', ' ')))) {
      score += 0.4;
      reasons.push(`Has ${amenity.replace('-', ' ')} you prefer`);
    } else {
      concerns.push(`Missing ${amenity.replace('-', ' ')} you might want`);
    }
  }
  
  // Check lifestyle preferences
  for (const lifestyle of archetype.preferences.lifestyle) {
    if (featuresLower.some(f => f.includes(lifestyle))) {
      score += 0.3;
      reasons.push(`Supports your ${lifestyle} lifestyle`);
    } else {
      concerns.push(`May not fit your ${lifestyle} preferences`);
    }
  }
  
  return { 
    score: Math.min(score, 1.0), 
    reasons: reasons.slice(0, 3), // Limit to top 3 reasons
    concerns: concerns.slice(0, 2) // Limit to top 2 concerns
  };
}

export type PersonalityArchetype = Archetype;