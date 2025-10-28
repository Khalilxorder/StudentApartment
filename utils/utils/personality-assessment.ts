// Personality Assessment Utilities
// Implementation for connecting with external personality assessment service

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PersonalityAssessment {
  id: string;
  userId: string;
  traits: PersonalityTraits;
  archetype?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mock database - in production, this would be stored in Supabase
const mockAssessments: Map<string, PersonalityAssessment> = new Map();

export async function getPersonalityAssessment(userId: string): Promise<PersonalityAssessment | null> {
  // Check mock database first
  const assessment = mockAssessments.get(userId);
  if (assessment) {
    return assessment;
  }

  // In production, this would query Supabase
  // const { data } = await supabase
  //   .from('personality_assessments')
  //   .select('*')
  //   .eq('user_id', userId)
  //   .single();

  return null;
}

export async function connectPersonalityAssessment(userId: string, token?: string): Promise<boolean> {
  try {
    // Simulate opening external personality assessment website
    // In production, this would open a popup to the external service
    const assessmentUrl = `https://self-assessment-battery.com/assess?user=${userId}&callback=${encodeURIComponent(window.location.origin + '/api/personality/callback')}`;

    // For demo purposes, simulate a successful connection
    // In production, this would:
    // 1. Open popup window to external assessment site
    // 2. Handle OAuth/callback flow
    // 3. Receive assessment results via webhook or callback

    // Simulate receiving assessment results
    const mockTraits: PersonalityTraits = {
      openness: Math.random(),
      conscientiousness: Math.random(),
      extraversion: Math.random(),
      agreeableness: Math.random(),
      neuroticism: Math.random()
    };

    const assessment: PersonalityAssessment = {
      id: `assessment_${userId}`,
      userId,
      traits: mockTraits,
      archetype: getArchetypeFromTraits(mockTraits),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in mock database
    mockAssessments.set(userId, assessment);

    // In production, save to Supabase
    // await supabase.from('personality_assessments').upsert({
    //   user_id: userId,
    //   traits: mockTraits,
    //   archetype: assessment.archetype,
    //   created_at: new Date().toISOString(),
    //   updated_at: new Date().toISOString()
    // });

    return true;
  } catch (error) {
    console.error('Error connecting personality assessment:', error);
    return false;
  }
}

export async function getPersonalityBasedRecommendations(userId: string, apartments: any[]): Promise<any[]> {
  const assessment = await getPersonalityAssessment(userId);
  if (!assessment) {
    return apartments; // Return as-is if no assessment
  }

  // Calculate scores for all apartments
  const apartmentsWithScores = await Promise.all(
    apartments.map(async (apartment) => ({
      ...apartment,
      personalityScore: await calculateSuitabilityScore(apartment, assessment.traits)
    }))
  );

  // Sort apartments based on personality compatibility
  return apartmentsWithScores.sort((a, b) => b.personalityScore - a.personalityScore);
}

export async function analyzeUserStory(story: string): Promise<any> {
  // Simple keyword-based analysis for demo
  const traits: Partial<PersonalityTraits> = {};
  const insights: string[] = [];

  const lowerStory = story.toLowerCase();

  if (lowerStory.includes('creative') || lowerStory.includes('art') || lowerStory.includes('music')) {
    traits.openness = 0.8;
    insights.push('Creative and open to new experiences');
  }

  if (lowerStory.includes('organized') || lowerStory.includes('structured') || lowerStory.includes('planned')) {
    traits.conscientiousness = 0.8;
    insights.push('Values organization and structure');
  }

  if (lowerStory.includes('social') || lowerStory.includes('party') || lowerStory.includes('friends')) {
    traits.extraversion = 0.8;
    insights.push('Enjoys social interactions');
  }

  if (lowerStory.includes('quiet') || lowerStory.includes('study') || lowerStory.includes('peaceful')) {
    traits.extraversion = 0.3;
    insights.push('Prefers quiet, focused environment');
  }

  return { traits, insights };
}

export async function generateFollowUpQuestions(assessment: any): Promise<string[]> {
  const questions: string[] = [];

  if (!assessment.traits?.openness || assessment.traits.openness < 0.5) {
    questions.push('Are you open to trying new types of neighborhoods?');
  }

  if (!assessment.traits?.conscientiousness || assessment.traits.conscientiousness < 0.5) {
    questions.push('How important is it for you to have a well-maintained apartment?');
  }

  if (!assessment.traits?.extraversion) {
    questions.push('Do you prefer a lively social atmosphere or a more quiet setting?');
  }

  return questions.slice(0, 3); // Return up to 3 questions
}

export async function calculateSuitabilityScore(apartment: any, userTraits: PersonalityTraits): Promise<number> {
  let score = 50; // Base score

  // Adjust based on traits
  if (userTraits.openness > 0.7 && apartment.furnishing === 'furnished') {
    score += 15; // Creative types like furnished spaces
  }

  if (userTraits.conscientiousness > 0.7 && apartment.elevator === 'yes') {
    score += 10; // Organized types appreciate modern amenities
  }

  if (userTraits.extraversion > 0.7 && apartment.balcony === 'yes') {
    score += 10; // Social types like outdoor spaces
  }

  if (userTraits.extraversion < 0.4 && apartment.floor_number > 5) {
    score -= 10; // Introverted types might prefer lower floors
  }

  if (userTraits.agreeableness > 0.7 && apartment.pet_friendly) {
    score += 5; // Agreeable people might consider pet-friendly
  }

  return Math.max(0, Math.min(100, score));
}

export async function generatePersonalizedDescription(apartment: any, userTraits: PersonalityTraits): Promise<string> {
  let description = apartment.description || 'A great apartment option.';

  if (userTraits.openness > 0.7) {
    description += ' This space offers creative potential with its unique layout.';
  }

  if (userTraits.conscientiousness > 0.7) {
    description += ' Well-maintained and perfect for focused living.';
  }

  if (userTraits.extraversion > 0.7) {
    description += ' Great for entertaining friends and enjoying social activities.';
  }

  return description;
}

function getArchetypeFromTraits(traits: PersonalityTraits): string {
  if (traits.openness > 0.7) return 'creative-explorer';
  if (traits.conscientiousness > 0.8) return 'organized-planner';
  if (traits.extraversion > 0.7) return 'social-butterfly';
  if (traits.agreeableness > 0.7) return 'harmonious-cohabitant';
  return 'balanced-individual';
}

// Function to open external assessment in popup
export function openPersonalityAssessmentPopup(userId: string): Promise<PersonalityAssessment | null> {
  return new Promise((resolve) => {
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(
      `https://self-assessment-battery.com/assess?user=${userId}&callback=${encodeURIComponent(window.location.origin + '/api/personality/callback')}`,
      'personality-assessment',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      alert('Please allow popups for this site to complete personality assessment.');
      resolve(null);
      return;
    }

    // Listen for messages from the popup
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'PERSONALITY_ASSESSMENT_COMPLETE') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        resolve(event.data.assessment);
      }
    };

    window.addEventListener('message', messageHandler);

    // Fallback timeout
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      if (!popup.closed) {
        popup.close();
      }
      resolve(null);
    }, 300000); // 5 minutes
  });
}