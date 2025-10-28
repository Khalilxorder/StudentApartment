// Archetypal Apartment Matching System
// Based on Jungian archetypes, Big Five personality traits, and Peterson's psychological frameworks

export interface ArchetypeProfile {
  primaryArchetype: Archetype;
  bigFiveScores: BigFiveScores;
  symbolicResonances: string[];
  spiritualConnections: SpiritualConnection[];
}

export interface BigFiveScores {
  openness: number; // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface SpiritualConnection {
  archetype: Archetype;
  resonance: number; // 0-100
  meaningfulExperience: number; // How interesting/meaningful this would be
  symbolicElements: string[];
}

export enum Archetype {
  FATHER = 'father',
  MOTHER = 'mother',
  SON_HERO = 'son_hero',
  MAGICIAN = 'magician',
  WARRIOR = 'warrior',
  LOVER = 'lover',
  CREATOR = 'creator',
  RULER = 'ruler',
  SAGE = 'sage',
  FOOL = 'fool'
}

// Jungian Archetype Associations with Big Five Traits
export const ARCHETYPE_BIG_FIVE_CORRELATIONS = {
  [Archetype.FATHER]: {
    primaryTraits: { conscientiousness: 85, agreeableness: 60, neuroticism: 40 },
    description: "Order, rules, limits, ground, walls, stability, masculine, home, rigidity, sun, pattern, day",
    positive: "Authority, protection, structure, wisdom",
    negative: "Tyrannical, rigid, controlling, oppressive"
  },
  [Archetype.MOTHER]: {
    primaryTraits: { agreeableness: 80, openness: 70, neuroticism: 50 },
    description: "Dragon, forest, nature, feminine, moon, night, ocean, sea, water examples",
    positive: "Compassionate, loving, beautiful, nurturing, creative",
    negative: "Chaos, all-eating, swallowing witch, destructive, overwhelming"
  },
  [Archetype.SON_HERO]: {
    primaryTraits: { extraversion: 75, conscientiousness: 70, openness: 65 },
    description: "Ego, hero's journey, transformation, courage, self-discovery",
    positive: "Brave, determined, transformative, victorious",
    negative: "Anti-hero, reckless, self-destructive, immature"
  },
  [Archetype.MAGICIAN]: {
    primaryTraits: { openness: 90, conscientiousness: 75, introversion: 70 },
    description: "Transformation, alchemy, wisdom, mystery, hidden knowledge",
    positive: "Wise, transformative, insightful, masterful",
    negative: "Manipulative, deceptive, isolated, arrogant"
  },
  [Archetype.WARRIOR]: {
    primaryTraits: { conscientiousness: 80, extraversion: 70, agreeableness: 50 },
    description: "Strength, courage, discipline, protection, honor",
    positive: "Brave, disciplined, protective, honorable",
    negative: "Aggressive, violent, rigid, uncompromising"
  },
  [Archetype.LOVER]: {
    primaryTraits: { extraversion: 80, agreeableness: 75, openness: 70 },
    description: "Beauty, passion, harmony, relationships, sensuality",
    positive: "Passionate, harmonious, beautiful, connective",
    negative: "Obsessive, superficial, manipulative, possessive"
  },
  [Archetype.CREATOR]: {
    primaryTraits: { openness: 85, extraversion: 65, conscientiousness: 60 },
    description: "Innovation, imagination, creation, expression, originality",
    positive: "Creative, innovative, expressive, visionary",
    negative: "Chaotic, unfocused, impractical, self-indulgent"
  },
  [Archetype.RULER]: {
    primaryTraits: { conscientiousness: 85, extraversion: 70, agreeableness: 45 },
    description: "Leadership, order, control, responsibility, authority",
    positive: "Organized, responsible, authoritative, fair",
    negative: "Tyrannical, controlling, unjust, power-hungry"
  },
  [Archetype.SAGE]: {
    primaryTraits: { openness: 80, conscientiousness: 75, agreeableness: 70 },
    description: "Wisdom, knowledge, understanding, truth, contemplation",
    positive: "Wise, knowledgeable, truthful, contemplative",
    negative: "Dogmatic, detached, impractical, arrogant"
  },
  [Archetype.FOOL]: {
    primaryTraits: { openness: 75, extraversion: 70, conscientiousness: 30 },
    description: "Freedom, spontaneity, innocence, new beginnings, joy",
    positive: "Free-spirited, joyful, spontaneous, innocent",
    negative: "Irresponsible, reckless, naive, foolish"
  }
};

// Symbolic Apartment Archetypes (Garden of Eden as Universal Standard)
export const APARTMENT_ARCHETYPES = {
  // Universal Standard
  GARDEN_OF_EDEN: {
    name: "Garden of Eden",
    description: "Perfect harmony, natural abundance, innocence, paradise",
    symbolicElements: ["harmony", "abundance", "innocence", "natural", "paradise"],
    apartmentFeatures: ["garden", "natural_light", "peaceful", "abundant_space", "harmony"],
    personalityCorrelation: {
      openness: 80,
      agreeableness: 75,
      neuroticism: 20
    }
  },

  // Father Archetype Spaces
  FATHERS_CITADEL: {
    name: "Father's Citadel",
    description: "Strong walls, ordered structure, protective authority, solar illumination",
    symbolicElements: ["strength", "order", "protection", "authority", "illumination"],
    apartmentFeatures: ["strong_walls", "structured_layout", "protective", "bright_light", "ordered"],
    personalityCorrelation: {
      conscientiousness: 85,
      agreeableness: 60,
      neuroticism: 40
    }
  },

  // Mother Archetype Spaces
  MOTHERS_SANCTUARY: {
    name: "Mother's Sanctuary",
    description: "Nurturing embrace, natural flow, lunar mystery, oceanic depth",
    symbolicElements: ["nurturing", "flow", "mystery", "depth", "embrace"],
    apartmentFeatures: ["curved_spaces", "natural_flow", "soft_light", "depth", "embrace"],
    personalityCorrelation: {
      agreeableness: 80,
      openness: 70,
      neuroticism: 50
    }
  },

  // Son/Hero Archetype Spaces
  HEROS_JOURNEY: {
    name: "Hero's Journey",
    description: "Transformative path, courageous ascent, ego development, victory",
    symbolicElements: ["transformation", "ascent", "courage", "development", "victory"],
    apartmentFeatures: ["progressive_spaces", "elevated_views", "challenging_access", "growth_path"],
    personalityCorrelation: {
      extraversion: 75,
      conscientiousness: 70,
      openness: 65
    }
  }
};

// Calculate spiritual connection based on archetypal resonance
export function calculateSpiritualConnection(
  userProfile: ArchetypeProfile,
  apartmentFeatures: string[]
): SpiritualConnection[] {
  const connections: SpiritualConnection[] = [];

  // Analyze each archetype for resonance
  Object.values(Archetype).forEach(archetype => {
    const correlation = ARCHETYPE_BIG_FIVE_CORRELATIONS[archetype];
    const archetypeResonance = calculateArchetypeResonance(userProfile, archetype);

    // Calculate meaningful experience potential
    const meaningfulExperience = calculateMeaningfulExperience(
      userProfile,
      apartmentFeatures,
      archetype
    );

    // Find symbolic elements that resonate
    const symbolicElements = findSymbolicResonances(
      userProfile.symbolicResonances,
      apartmentFeatures,
      archetype
    );

    connections.push({
      archetype,
      resonance: archetypeResonance,
      meaningfulExperience,
      symbolicElements
    });
  });

  return connections.sort((a, b) => b.meaningfulExperience - a.meaningfulExperience);
}

// Calculate how much an archetype resonates with user profile
function calculateArchetypeResonance(userProfile: ArchetypeProfile, archetype: Archetype): number {
  const correlation = ARCHETYPE_BIG_FIVE_CORRELATIONS[archetype];
  let resonance = 0;

  // Big Five trait alignment
  Object.entries(correlation.primaryTraits).forEach(([trait, idealScore]) => {
    const userScore = userProfile.bigFiveScores[trait as keyof BigFiveScores] || 50;
    const difference = Math.abs(userScore - idealScore);
    resonance += Math.max(0, 100 - difference);
  });

  // Symbolic resonance bonus
  if (userProfile.symbolicResonances.some(symbol =>
    correlation.description.toLowerCase().includes(symbol.toLowerCase())
  )) {
    resonance += 20;
  }

  return Math.min(100, resonance / Object.keys(correlation.primaryTraits).length);
}

// Calculate how meaningful this experience would be
function calculateMeaningfulExperience(
  userProfile: ArchetypeProfile,
  apartmentFeatures: string[],
  archetype: Archetype
): number {
  let meaningfulness = 0;

  // Primary archetype alignment
  if (userProfile.primaryArchetype === archetype) {
    meaningfulness += 40;
  }

  // Symbolic resonance with apartment features
  const archetypeFeatures = getArchetypeApartmentFeatures(archetype);
  const matchingFeatures = apartmentFeatures.filter(feature =>
    archetypeFeatures.includes(feature)
  );

  meaningfulness += (matchingFeatures.length / archetypeFeatures.length) * 40;

  // Big Five optimal experience potential
  const optimalTraits = ARCHETYPE_BIG_FIVE_CORRELATIONS[archetype].primaryTraits;
  Object.entries(optimalTraits).forEach(([trait, idealScore]) => {
    const userScore = userProfile.bigFiveScores[trait as keyof BigFiveScores] || 50;
    if (Math.abs(userScore - idealScore) < 20) {
      meaningfulness += 5; // Bonus for being in optimal range
    }
  });

  return Math.min(100, meaningfulness);
}

// Find symbolic resonances between user and apartment
function findSymbolicResonances(
  userSymbols: string[],
  apartmentFeatures: string[],
  archetype: Archetype
): string[] {
  const resonances: string[] = [];
  const archetypeSymbols = ARCHETYPE_BIG_FIVE_CORRELATIONS[archetype].description
    .toLowerCase().split(', ');

  // Direct symbol matches
  userSymbols.forEach(userSymbol => {
    archetypeSymbols.forEach(archetypeSymbol => {
      if (userSymbol.toLowerCase().includes(archetypeSymbol) ||
          archetypeSymbol.includes(userSymbol.toLowerCase())) {
        resonances.push(`${userSymbol} ↔ ${archetypeSymbol}`);
      }
    });
  });

  // Feature-based symbolic connections
  const featureSymbols = apartmentFeatures.map(feature => {
    switch(feature) {
      case 'high_ceiling': return 'transcendence, aspiration';
      case 'garden_view': return 'paradise, natural harmony';
      case 'private_space': return 'sanctuary, introspection';
      case 'open_layout': return 'freedom, possibility';
      case 'bright_light': return 'illumination, clarity';
      case 'curved_walls': return 'embrace, nurturing';
      case 'elevated_position': return 'perspective, freedom';
      default: return feature;
    }
  });

  return [...resonances, ...featureSymbols];
}

// Get apartment features associated with an archetype
function getArchetypeApartmentFeatures(archetype: Archetype): string[] {
  switch(archetype) {
    case Archetype.FATHER:
      return ['strong_walls', 'structured_layout', 'protective', 'bright_light', 'ordered', 'stable'];
    case Archetype.MOTHER:
      return ['curved_spaces', 'natural_flow', 'soft_light', 'depth', 'embrace', 'nurturing'];
    case Archetype.SON_HERO:
      return ['progressive_spaces', 'elevated_views', 'challenging_access', 'growth_path', 'transformation'];
    case Archetype.MAGICIAN:
      return ['private_space', 'mysterious_elements', 'transformative_layout', 'hidden_features'];
    default:
      return [];
  }
}

// Generate intelligent "why this?" explanation
export function generateIntelligentMatchExplanation(
  userProfile: ArchetypeProfile,
  apartment: any,
  matchedFeatures: any[]
): string {
  const spiritualConnections = calculateSpiritualConnection(userProfile, apartment.features || []);

  let explanation = `🎯 **${Math.round(spiritualConnections[0]?.meaningfulExperience || 0)}% Archetypal Match**\n\n`;

  // Primary archetype resonance
  const primaryConnection = spiritualConnections[0];
  if (primaryConnection && primaryConnection.meaningfulExperience > 60) {
    const archetype = ARCHETYPE_BIG_FIVE_CORRELATIONS[primaryConnection.archetype];
    explanation += `**${archetype.description}**\n`;
    explanation += `This space resonates deeply with your ${primaryConnection.archetype} archetype, `;
    explanation += `offering a ${primaryConnection.meaningfulExperience > 80 ? 'transformative' : 'meaningful'} `;
    explanation += `experience that aligns with your core psychological patterns.\n\n`;
  }

  // Symbolic connections
  if (primaryConnection?.symbolicElements.length > 0) {
    explanation += `**Symbolic Resonances:**\n`;
    primaryConnection.symbolicElements.slice(0, 3).forEach(element => {
      explanation += `• ${element}\n`;
    });
    explanation += `\n`;
  }

  // Big Five alignment
  explanation += `**Personality Alignment:**\n`;
  const correlations = ARCHETYPE_BIG_FIVE_CORRELATIONS[primaryConnection?.archetype || userProfile.primaryArchetype];
  Object.entries(correlations.primaryTraits).forEach(([trait, idealScore]) => {
    const userScore = userProfile.bigFiveScores[trait as keyof BigFiveScores] || 50;
    const alignment = Math.abs(userScore - idealScore) < 20 ? '✓' : '○';
    explanation += `${alignment} ${trait}: ${userScore}/100 (ideal: ${idealScore})\n`;
  });

  // Practical matches
  if (matchedFeatures.length > 0) {
    explanation += `\n**Factual Matches:**\n`;
    matchedFeatures.slice(0, 3).forEach(feature => {
      explanation += `✓ ${feature.name}\n`;
    });
  }

  return explanation;
}