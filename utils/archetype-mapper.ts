
import { Apartment } from '@/types/apartment';
import {
    Archetype,
    ARCHETYPE_BIG_FIVE_CORRELATIONS,
    APARTMENT_ARCHETYPES
} from '@/utils/archetypal-matching';

export interface ApartmentArchetypeAnalysis {
    primaryArchetype: Archetype;
    secondaryArchetype?: Archetype;
    gardenAlignment: number; // 0-100
    symbolicTags: string[];
    archetypalDescription: string;
}

const KEYWORD_MAPPINGS: Record<string, Archetype> = {
    // Magician (Tech, Smart, Transformation)
    'smart': Archetype.MAGICIAN,
    'modern': Archetype.MAGICIAN,
    'technology': Archetype.MAGICIAN,
    'renovated': Archetype.MAGICIAN,
    'studio': Archetype.MAGICIAN,
    'creative': Archetype.MAGICIAN,

    // Caregiver (Home, Cozy, Family) -> Mapping to MOTHER for now as closest standard
    'cozy': Archetype.MOTHER,
    'family': Archetype.MOTHER,
    'warm': Archetype.MOTHER,
    'safe': Archetype.MOTHER,
    'quiet': Archetype.MOTHER,
    'garden': Archetype.MOTHER,

    // Ruler (Luxury, View, Penthouse)
    'luxury': Archetype.RULER,
    'penthouse': Archetype.RULER,
    'exclusive': Archetype.RULER,
    'view': Archetype.RULER,
    'premium': Archetype.RULER,
    'district 5': Archetype.RULER, // Prestigious district

    // Creator (Art, Unique, Design)
    'unique': Archetype.CREATOR,
    'art': Archetype.CREATOR,
    'design': Archetype.CREATOR,
    'spacious': Archetype.CREATOR,
    'light': Archetype.CREATOR,
    'bohemian': Archetype.CREATOR,

    // Sage (Books, Quiet, Study)
    'library': Archetype.SAGE,
    'university': Archetype.SAGE,
    'study': Archetype.SAGE,
    'peaceful': Archetype.SAGE,
    'classic': Archetype.SAGE,
};

export function analyzeApartmentArchetype(apartment: Apartment): ApartmentArchetypeAnalysis {
    if (!apartment) {
        return {
            primaryArchetype: Archetype.MAGICIAN, // Default
            gardenAlignment: 50,
            symbolicTags: ['Potential'],
            archetypalDescription: 'A space waiting to reveal its true nature.'
        };
    }

    const textToAnalyze = `${apartment.title} ${apartment.description} ${apartment.amenities?.join(' ')}`.toLowerCase();

    // 1. Calculate Archetype Scores
    const scores: Record<string, number> = {};

    Object.entries(KEYWORD_MAPPINGS).forEach(([keyword, type]) => {
        if (textToAnalyze.includes(keyword)) {
            scores[type] = (scores[type] || 0) + 1;
        }
    });

    // Add structural bonuses
    if (apartment.floor_number && apartment.floor_number > 2) scores[Archetype.SON_HERO] = (scores[Archetype.SON_HERO] || 0) + 2; // High up = Hero/Ascent
    if (apartment.size_sqm && apartment.size_sqm > 100) scores[Archetype.RULER] = (scores[Archetype.RULER] || 0) + 2; // Big = Ruler
    if (apartment.price_huf < 150000) scores[Archetype.FOOL] = (scores[Archetype.FOOL] || 0) + 2; // Cheap = Freedom/Fool

    // Find top archetype
    let maxScore = -1;
    let primaryArchetype = Archetype.MAGICIAN; // Default

    Object.entries(scores).forEach(([type, score]) => {
        if (score > maxScore) {
            maxScore = score;
            primaryArchetype = type as Archetype;
        }
    });

    // 2. Calculate Garden of Eden Alignment
    // Base on "Natural" keywords + Balcony + Light
    let gardenScore = 50; // Base score
    if (textToAnalyze.includes('garden')) gardenScore += 20;
    if (textToAnalyze.includes('park')) gardenScore += 10;
    if (textToAnalyze.includes('light')) gardenScore += 10;
    if (textToAnalyze.includes('green')) gardenScore += 10;
    if (textToAnalyze.includes('quiet')) gardenScore += 10;
    if (textToAnalyze.includes('view')) gardenScore += 10;
    if ((apartment.balcony || 0) > 0) gardenScore += 10;

    // Cap at 98% (nothing is perfect)
    const gardenAlignment = Math.min(98, Math.max(20, gardenScore));

    // 3. Generate Symbolic Tags
    const symbolicTags = [];
    const archetypeData = ARCHETYPE_BIG_FIVE_CORRELATIONS[primaryArchetype];

    if (gardenAlignment > 80) symbolicTags.push('🌿 Eden Resonant');
    if ((apartment.floor_number || 0) > 3) symbolicTags.push('🦅 Sky Perspective');
    if (textToAnalyze.includes('smart') || textToAnalyze.includes('tech')) symbolicTags.push('🔮 Tech-Alchemized');
    if (textToAnalyze.includes('quiet') || textToAnalyze.includes('peace')) symbolicTags.push('🧘 Zen Sanctuary');

    // Add an archetype-specific tag
    symbolicTags.push(`✨ ${archetypeData.positive.split(',')[0]} Energy`);

    // 4. Generate Description
    const archetypalDescription = `This space strongly resonates with the **${primaryArchetype}** archetype. 
  ${archetypeData.description.split(',').slice(0, 3).join(', ')} define its character. 
  It offers a ${archetypeData.positive.split(',')[0].toLowerCase()} environment suitable for those seeking ${archetypeData.positive.split(',')[1].toLowerCase()}.`;

    return {
        primaryArchetype,
        gardenAlignment,
        symbolicTags,
        archetypalDescription
    };
}
