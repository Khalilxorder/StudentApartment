'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { useTranslations } from '@/lib/i18n';
import {
  matchFeaturesFromStory,
  calculateFeatureMatchScore,
  FeatureIcon
} from '@/utils/feature-icons';
import { sanitizeUserInput } from '@/lib/sanitize';
import {
  generateIntelligentMatchExplanation,
  ArchetypeProfile,
  Archetype,
  ARCHETYPE_BIG_FIVE_CORRELATIONS
} from '@/utils/archetypal-matching';
import ApartmentExplanationModal from './ApartmentExplanationModal';
import ExplainWhy, { RecommendationReason } from './ExplainWhy';

type Message = {
  id: string;
  from: 'user' | 'ai' | 'system';
  text: string;
};

const EXPLAIN_WEIGHTS = [0.85, 0.7, 0.55];

function buildExplainReasons(
  reasons: string[] | undefined,
  matchedFeatures: FeatureIcon[]
): RecommendationReason[] {
  const normalized = Array.isArray(reasons)
    ? reasons.filter(Boolean)
    : [];

  if (normalized.length === 0 && matchedFeatures.length > 0) {
    return matchedFeatures.slice(0, 3).map((feature, index) => ({
      factor: feature.name,
      description: `Matches your preference for ${feature.name.toLowerCase()}`,
      weight: EXPLAIN_WEIGHTS[index] ?? 0.45,
    }));
  }

  return normalized.slice(0, 3).map((reason, index) => {
    const [factorPart, ...rest] = reason.split(':');
    const hasDetail = rest.length > 0;
    const factor = hasDetail ? factorPart.trim() : `Reason ${index + 1}`;
    const description = hasDetail ? rest.join(':').trim() : reason.trim();

    return {
      factor: factor || `Reason ${index + 1}`,
      description,
      weight: EXPLAIN_WEIGHTS[index] ?? 0.45,
    };
  });
}

export default function ChatSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [userWishedFeatures, setUserWishedFeatures] = useState<FeatureIcon[]>([]);
  const [currentResults, setCurrentResults] = useState<any[]>([]);
  const [displayedResults, setDisplayedResults] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'match' | 'price-low' | 'price-high' | 'bedrooms'>('match');
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatHovered, setChatHovered] = useState(false);
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(true); // Always show some history
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isOnline, setIsOnline] = useState(true);
  const [userArchetypeProfile, setUserArchetypeProfile] = useState<ArchetypeProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalExplanation, setModalExplanation] = useState('');
  const [modalApartmentTitle, setModalApartmentTitle] = useState('');
  const [modalMatchScore, setModalMatchScore] = useState(0);
  const [modalReasons, setModalReasons] = useState<RecommendationReason[]>([]);
  const resultsPerPage = 12;
  const chatRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // Load cached data on mount OR clear if URL has ?clear parameter
  useEffect(() => {
    // Check if we should clear the cache (home icon was clicked)
    const urlParams = new URLSearchParams(window.location.search);
    const shouldClear = urlParams.get('clear') === 'true' || window.location.pathname === '/';
    
    if (shouldClear && window.location.search.includes('clear')) {
      // Clear everything and remove the parameter
      localStorage.removeItem('chatSearch_results');
      localStorage.removeItem('chatSearch_messages');
      localStorage.removeItem('chatSearch_features');
      setCurrentResults([]);
      setMessages([]);
      setUserWishedFeatures([]);
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Load cached data
      const cachedResults = localStorage.getItem('chatSearch_results');
      const cachedMessages = localStorage.getItem('chatSearch_messages');
      const cachedFeatures = localStorage.getItem('chatSearch_features');
      
      if (cachedResults) {
        try {
          setCurrentResults(JSON.parse(cachedResults));
        } catch (err) {
          console.warn('Failed to load cached results:', err);
        }
      }
      
      if (cachedMessages) {
        try {
          setMessages(JSON.parse(cachedMessages));
        } catch (err) {
          console.warn('Failed to load cached messages:', err);
        }
      }
      
      if (cachedFeatures) {
        try {
          setUserWishedFeatures(JSON.parse(cachedFeatures));
        } catch (err) {
          console.warn('Failed to load cached features:', err);
        }
      }
    }

    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save to cache when data changes
  useEffect(() => {
    if (currentResults.length > 0) {
      localStorage.setItem('chatSearch_results', JSON.stringify(currentResults));
    } else {
      localStorage.removeItem('chatSearch_results');
    }
  }, [currentResults]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatSearch_messages', JSON.stringify(messages));
    } else {
      localStorage.removeItem('chatSearch_messages');
    }
  }, [messages]);

  useEffect(() => {
    if (userWishedFeatures.length > 0) {
      localStorage.setItem('chatSearch_features', JSON.stringify(userWishedFeatures));
    } else {
      localStorage.removeItem('chatSearch_features');
    }
  }, [userWishedFeatures]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getSession();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const sorted = [...currentResults];
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => (a.price_huf || a.price || 0) - (b.price_huf || b.price || 0));
        break;
      case 'price-high':
        sorted.sort((a, b) => (b.price_huf || b.price || 0) - (a.price_huf || b.price || 0));
        break;
      case 'bedrooms':
        sorted.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
        break;
      case 'match':
      default:
        sorted.sort((a, b) => {
          const scoreA = a.aiScore || a.featureMatchScore || 0;
          const scoreB = b.aiScore || b.featureMatchScore || 0;
          return scoreB - scoreA;
        });
    }
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    setDisplayedResults(sorted.slice(startIndex, endIndex));
  }, [currentResults, sortBy, currentPage]);

  const pushMessage = (from: 'user' | 'ai' | 'system', text: string) => {
    setMessages(m => [...m, { 
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
      from, 
      text
    }]);
  };

  const handleWhyThisClick = (
    apartment: any,
    context?: { matchedFeatures?: FeatureIcon[]; matchScore?: number; aiReasons?: RecommendationReason[] }
  ) => {
    // Create a default archetype profile if none exists
    const defaultProfile: ArchetypeProfile = {
      primaryArchetype: Archetype.MAGICIAN,
      bigFiveScores: {
        openness: 75,
        conscientiousness: 70,
        extraversion: 65,
        agreeableness: 70,
        neuroticism: 40
      },
      symbolicResonances: ['freedom', 'creativity', 'mystery'],
      spiritualConnections: []
    };

    const profile = userArchetypeProfile || defaultProfile;
    const matchedFeatures = context?.matchedFeatures || apartment.matchedFeatures || [];
    const apartmentForExplanation = matchedFeatures.length
      ? { ...apartment, matchedFeatures }
      : apartment;
    const explanationReasons =
      context?.aiReasons && context.aiReasons.length > 0
        ? context.aiReasons
        : buildExplainReasons(apartment.aiReasons, matchedFeatures);
    let explanation = generateIntelligentMatchExplanation(
      profile,
      apartmentForExplanation,
      matchedFeatures
    );

    if (explanationReasons.length > 0) {
      const reasonsList = explanationReasons
        .map((reason) => `- ${reason.factor}: ${reason.description}`)
        .join('\n');
      explanation += `\n\n**Top reasons**\n${reasonsList}`;
    }

    // Extract match score (handle different property names)
    const scoreSource =
      context?.matchScore ??
      apartment.aiScore ??
      apartment.featureMatchScore ??
      50;
    const userScore = Math.round(scoreSource);

    // Show in modal instead of chat
    setModalExplanation(explanation);
    setModalApartmentTitle(apartment.title || apartment.address || 'Apartment');
    setModalMatchScore(userScore);
    setModalReasons(explanationReasons);
    setModalOpen(true);
  };

  const parseNaturalLanguage = (text: string) => {
    const lower = text.toLowerCase();
    const result: any = {};
    console.log('🔎 Parsing:', text);

    const bedroomMatch = lower.match(/(\d+)[\s-]*(?:bedroom|bed|br|room)/);
    if (bedroomMatch) result.bedrooms = parseInt(bedroomMatch[1]);
    else if (lower.includes('studio')) result.bedrooms = 1;

    // Match "100k budget", "with 100k", etc.
    const budgetMatch = lower.match(/(?:budget|with|have)\s*(?:of)?\s*(\d+)(?:k|000|,000)?/i);
    if (budgetMatch) {
      const price = parseInt(budgetMatch[1]);
      result.maxPrice = price > 1000 ? price : price * 1000;
      console.log('💰 Budget detected:', result.maxPrice);
    }

    // Match "120k or lower", "under 100k", "below 150000", "max 120k"
    const maxPriceMatch = lower.match(/(\d+)(?:k|000|,000)?\s*(?:or\s*)?(?:lower|less|under|below|max|maximum|up\s*to)/i) || 
                           lower.match(/(?:under|below|max|maximum|up\s*to|less\s*than)\s*(\d+)(?:k|000|,000)?/i);
    if (maxPriceMatch) {
      const price = parseInt(maxPriceMatch[1]);
      result.maxPrice = price > 1000 ? price : price * 1000;
      console.log('💰 Max price detected:', result.maxPrice);
    }

    const minPriceMatch = lower.match(/(?:over|above|min|minimum|from|at\s*least|more\s*than)\s*(\d+)(?:k|000|,000)?/);
    if (minPriceMatch) {
      const price = parseInt(minPriceMatch[1]);
      result.minPrice = price > 1000 ? price : price * 1000;
    }

    // Match ranges like "100-120k", "between 100 and 120k", "100 to 120k"
    const rangeMatch = lower.match(/(\d+)(?:\s*-\s*|\s*to\s*|\s*and\s*)(\d+)(?:k|000|,000)?/i) ||
                        lower.match(/(?:between|from)\s+(\d+)(?:\s*-\s*|\s*to\s*|\s*and\s*)(\d+)(?:k|000|,000)?/i);
    if (rangeMatch) {
      const minPrice = parseInt(rangeMatch[1]);
      const maxPrice = parseInt(rangeMatch[2]);
      result.minPrice = minPrice > 1000 ? minPrice : minPrice * 1000;
      result.maxPrice = maxPrice > 1000 ? maxPrice : maxPrice * 1000;
      console.log('💰 Price range detected:', result.minPrice, '-', result.maxPrice);
    }

    const districtMatch = lower.match(/district\s*(\d+)/);
    if (districtMatch) result.district = parseInt(districtMatch[1]);

    const keywords: string[] = [];
    ['furnished','balcony','elevator','wifi','parking','pet','bright','quiet','cozy','modern','renovated','studio','private'].forEach(k => { if (lower.includes(k)) keywords.push(k); });
    if (keywords.length) result.search = keywords.join(' ');

    console.log('✅ Parse result:', result);
    return result;
  };

  const fetchApartments = async (filters: any) => {
    console.log('?? Fetching with filters:', filters);
    let query = supabase
      .from('apartments')
      .select(`
        id,
        title,
        address,
        description,
        price_huf,
        bedrooms,
        bathrooms,
        district,
        image_urls,
        amenities,
        pet_friendly,
        parking_available,
        internet_included,
        laundry_in_unit,
        elevator,
        distance_to_metro_m,
        distance_to_university_m,
        owner_verified,
        lease_min_months,
        created_at
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(60);

    if (filters.bedrooms) {
      console.log('? Filtering bedrooms >=', filters.bedrooms);
      query = query.gte('bedrooms', filters.bedrooms);
    }
    if (filters.minPrice) {
      console.log('? Filtering minPrice >=', filters.minPrice);
      query = query.gte('price_huf', filters.minPrice);
    }
    if (filters.maxPrice) {
      console.log('? Filtering maxPrice <=', filters.maxPrice);
      query = query.lte('price_huf', filters.maxPrice);
    }
    if (filters.district) {
      console.log('? Filtering district =', filters.district);
      query = query.eq('district', filters.district);
    }
    if (filters.search) {
      const sanitized = String(filters.search)
        .replace(/['%_]/g, ' ')
        .trim();
      if (sanitized) {
        console.log('? Searching for:', sanitized);
        query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,address.ilike.%${sanitized}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    console.log(`?? Found ${data?.length || 0} apartments from database`);
    return data || [];
  };  const runSearchFlow = async (story: string) => {
    setLoading(true);
    const sanitizedStory = sanitizeUserInput(story);
    setCurrentPage(1);
    setDisplayedResults([]);
    pushMessage('user', sanitizedStory);
    
    if (!isOnline) {
      pushMessage('ai', '📱 You are currently offline. Showing your previous search results...');
      // Show cached results if available
      const cachedResults = localStorage.getItem('chatSearch_results');
      if (cachedResults) {
        try {
          const results = JSON.parse(cachedResults);
          setCurrentPage(1);
          setCurrentResults(results);
          pushMessage('ai', `📱 Found ${results.length} cached apartments from your last search.`);
        } catch (err) {
          pushMessage('ai', '❌ No cached results available. Please check your connection and try again.');
        }
      } else {
        pushMessage('ai', '❌ No cached results available. Please check your connection and try again.');
      }
      setLoading(false);
      return;
    }

    pushMessage('ai', '🔍 Searching for apartments...');

    const localParse = parseNaturalLanguage(sanitizedStory);
    const detectedFeatures = matchFeaturesFromStory(sanitizedStory);
    
    setUserWishedFeatures(detectedFeatures);
    if (detectedFeatures.length > 0) {
      pushMessage('system', `✨ Detected ${detectedFeatures.length} features`);
    }

    try {
      console.log('🤖 Calling Gemini AI via secure API...');
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: sanitizedStory }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (response.ok) {
        const { analysis } = await response.json();
        console.log('✅ Gemini AI response:', analysis);
        Object.assign(localParse, analysis);
        pushMessage('system', '🤖 AI analysis complete');
      } else if (response.status === 503) {
        // Service unavailable - likely missing API key
        console.error('❌ Gemini AI service unavailable (503). Check GOOGLE_AI_API_KEY environment variable.');
        pushMessage('system', '⚠️ AI service unavailable - using local parsing. Please configure GOOGLE_AI_API_KEY for production.');
      } else if (response.status === 429) {
        // Rate limited
        console.error('❌ Gemini API rate limited');
        pushMessage('system', '⚠️ AI service rate limited - using local parsing');
      } else if (response.status === 500 || response.status === 502) {
        // Server error
        console.error(`❌ Gemini API server error (${response.status})`);
        pushMessage('system', '⚠️ AI service error - using local parsing');
      } else {
        throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('❌ Gemini AI request timeout');
        pushMessage('system', '⚠️ AI request timeout - using local parsing');
      } else {
        console.error('❌ Gemini AI failed:', err?.message);
        pushMessage('system', `⚠️ Using local parsing (AI unavailable: ${err?.message || 'unknown error'})`);
      }
    }

    let apartments = await fetchApartments(localParse);
    
    // Early return if no apartments found
    if (!apartments || apartments.length === 0) {
      pushMessage('ai', `❌ No apartments found matching your criteria. Try:
- Increasing your budget
- Removing specific location requirements
- Reducing the number of bedrooms`);
      setLoading(false);
      return;
    }

    let scored = apartments.map((apt: any) => {
      // Extract features from apartment data
      const apartmentFeatures: string[] = [];
      
      // Add features based on boolean flags
      if (apt.pet_friendly) apartmentFeatures.push('amen_pet_friendly');
      if (apt.parking_available) apartmentFeatures.push('loc_parking_street');
      if (apt.internet_included) apartmentFeatures.push('amen_internet');
      if (apt.laundry_in_unit) apartmentFeatures.push('amen_washing_machine');
      if (apt.elevator) apartmentFeatures.push('amen_elevator');
      
      // Add features based on amenities array
      if (apt.amenities && Array.isArray(apt.amenities)) {
        apt.amenities.forEach((amenity: string) => {
          // Map common amenity strings to feature IDs
          const amenityLower = amenity.toLowerCase();
          if (amenityLower.includes('balcony')) apartmentFeatures.push('amen_balcony');
          if (amenityLower.includes('terrace')) apartmentFeatures.push('amen_terrace');
          if (amenityLower.includes('garden')) apartmentFeatures.push('amen_garden');
          if (amenityLower.includes('furnished')) apartmentFeatures.push('amen_furnished');
          if (amenityLower.includes('air conditioning') || amenityLower.includes('ac')) apartmentFeatures.push('amen_ac');
          if (amenityLower.includes('heating')) apartmentFeatures.push('amen_heating');
          if (amenityLower.includes('dishwasher')) apartmentFeatures.push('amen_dishwasher');
          if (amenityLower.includes('gym')) apartmentFeatures.push('loc_gym');
          if (amenityLower.includes('pool')) apartmentFeatures.push('amen_pool');
        });
      }
      
      // Add location-based features
      if (apt.distance_to_metro_m && apt.distance_to_metro_m < 1000) apartmentFeatures.push('loc_metro');
      if (apt.distance_to_university_m && apt.distance_to_university_m < 2000) apartmentFeatures.push('loc_university');
      
      const userFeatureIds = detectedFeatures.map(f => f.id);
      const featureScore = calculateFeatureMatchScore(apartmentFeatures, userFeatureIds);
      
      return {
        ...apt,
        featureMatchScore: featureScore,
        featureTags: apartmentFeatures,
        aiReasons: [],
        aiCompromises: [],
      };
    });

    // Sort by feature score first to get best candidates for AI scoring
    scored.sort((a: any, b: any) => b.featureMatchScore - a.featureMatchScore);

    // Show results immediately - skip AI scoring to avoid hanging
    // (AI already analyzed user preferences, feature matching is sufficient)
    try {
      if (scored.length > 0) {
        setCurrentResults(scored);
        const topScore = scored[0]?.featureMatchScore || 0;
        pushMessage('ai', `✅ Found ${scored.length} apartments! Top match: ${Math.round(topScore)}% 🎯`);
      } else {
        pushMessage('ai', `❌ No apartments found matching your criteria.`);
      }
    } catch (err) {
      console.error('❌ Error displaying results:', err);
      setCurrentResults(scored);
      pushMessage('ai', `Found ${scored.length} apartments!`);
    }

    // SKIPPED: AI per-apartment scoring (commented out - was causing hangs)
    // The initial AI analysis of user preferences + feature matching is sufficient
    /*
    try {
      console.log('🤖 Starting AI scoring for top', Math.min(20, scored.length), 'apartments...');
      const topCandidates = scored.slice(0, Math.min(20, scored.length));
      
      let aiSuccessCount = 0;
      
      // Score apartments in parallel for much faster performance
      const scoringPromises = topCandidates.map(async (apt: any) => {
        try {
          const response = await fetch('/api/ai/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apartment: {
                id: apt.id,
                title: apt.title,
                price: typeof apt.price_huf === 'number' ? apt.price_huf : parseInt(apt.price_huf) || 0,
                location: apt.address || apt.district || 'Budapest',
                features: apt.featureTags || [],
                amenities: apt.amenities || [],
                size: (apt as any).size_sqm || null,
                rooms: apt.bedrooms,
              },
              userPreferences: localParse,
            }),
          });

          if (!response.ok) {
            throw new Error('AI scoring API failed');
          }

          const { result } = await response.json();
          aiSuccessCount++;
          return {
            ...apt,
            aiScore: result.score,
            aiReasons: Array.isArray(result.reasons) ? result.reasons : [],
            aiCompromises: Array.isArray(result.compromises) ? result.compromises : [],
          };
        } catch (err) {
          console.warn('?? AI scoring failed for apartment:', apt.id, err);
          return {
            ...apt,
            aiScore: apt.featureMatchScore ?? 55,
            aiReasons: apt.aiReasons ?? [],
            aiCompromises: apt.aiCompromises ?? [],
          };
        }
      });

      const scoredWithAI = await Promise.all(scoringPromises);
      console.log(`✅ AI scored ${aiSuccessCount}/${topCandidates.length} apartments in parallel`);

      // Re-sort with AI scores
      scoredWithAI.sort((a, b) => {
        const scoreA = a.aiScore || a.featureMatchScore || 0;
        const scoreB = b.aiScore || b.featureMatchScore || 0;
        return scoreB - scoreA;
      });
      
      if (scoredWithAI.length > 0) {
        setCurrentResults(scoredWithAI);
        const topScore = scoredWithAI[0]?.aiScore || scoredWithAI[0]?.featureMatchScore || 0;
        pushMessage('ai', `✅ Found ${scoredWithAI.length} apartments! Top match: ${Math.round(topScore)}% 🎯`);
      } else {
        // Fallback to basic scored results
        setCurrentResults(scored);
        pushMessage('ai', `Found ${scored.length} apartments!`);
      }

    } catch (err) {
      console.error('❌ AI scoring completely failed:', err);
      setCurrentResults(scored);
      pushMessage('ai', `Found ${scored.length} apartments!`);
    }
    */

    try {
      const response = await fetch('/api/ai/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          story: sanitizedStory, 
          preferences: localParse, 
          askedQuestions: Array.from(askedQuestions) 
        })
      });
      
      if (response.ok) {
        const { questions } = await response.json();
        const normalizedQuestions = Array.isArray(questions) ? questions.filter(Boolean) : [];
        setFollowUps(normalizedQuestions);
        if (normalizedQuestions.length > 0) {
          setAskedQuestions(prev => Array.from(new Set([...prev, ...normalizedQuestions])));
        }
      } else {
        throw new Error('Follow-up API failed');
      }
    } catch (err) {
      console.warn('⚠️ Follow-up questions failed:', err);
      const fallbackQuestions = [
        'Is your budget per person or total?',
        'Modern or traditional style?',
        'How important is proximity to public transport?'
      ];
      setFollowUps(fallbackQuestions);
      setAskedQuestions(prev => Array.from(new Set([...prev, ...fallbackQuestions])));
    }

    setLoading(false);
  };

  const handleSubmit = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const rawInput = typeof promptOverride === 'string' ? promptOverride : query;
    const trimmedInput = rawInput.trim();
    if (!trimmedInput || loading) return;
    const sanitizedQuery = sanitizeUserInput(trimmedInput);
    await runSearchFlow(sanitizedQuery);
    setQuery('');
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-gradient-to-b from-gray-50 to-white">
      {currentResults.length === 0 ? (
        /* Full-screen chat mode when no results */
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0" ref={chatRef}>
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Your Perfect Student Apartment</h1>
                  <div className="text-6xl mb-4">💬</div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Start your apartment search</h2>
                  <p className="text-gray-700 mb-6">Tell me your story</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <button 
                      onClick={() => setQuery("I'm a student at ELTE with 100k budget, want modern apartment near metro")}
                      className="p-5 bg-orange-50 hover:bg-orange-100 rounded-xl text-left border border-orange-200 transition"
                      aria-label="Use student example search: Student at ELTE, 100k budget, modern apartment near metro"
                    >
                      <div className="font-medium text-gray-900 mb-1">🎓 Student</div>
                      <div className="text-sm text-gray-700">&ldquo;Student at ELTE, 100k budget...&rdquo;</div>
                    </button>
                    <button 
                      onClick={() => setQuery("Looking for 2BR with balcony, quiet, budget 150k")}
                      className="p-5 bg-blue-50 hover:bg-blue-100 rounded-xl text-left border border-blue-200 transition"
                      aria-label="Use couple example search: 2BR with balcony, quiet, budget 150k"
                    >
                      <div className="font-medium text-gray-900 mb-1">💑 Couple</div>
                      <div className="text-sm text-gray-700">&ldquo;2BR with balcony, quiet, budget 150k&rdquo;</div>
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.from === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center mr-3 flex-shrink-0 text-sm font-bold">AI</div>
                  )}
                  <div className={`max-w-2xl px-4 py-3 rounded-2xl ${
                    msg.from === 'user' ? 'bg-orange-500 text-white rounded-br-sm' :
                    msg.from === 'ai' ? 'bg-gray-100 text-gray-900 rounded-bl-sm' :
                    'bg-yellow-50 text-yellow-900 text-sm border border-yellow-200'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.from === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center ml-3 flex-shrink-0 text-sm font-bold">You</div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center mr-3 text-sm font-bold">AI</div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input box - fixed at bottom with extra padding */}
          <div className="sticky bottom-0 left-0 right-0 border-t bg-white shadow-2xl z-50 pb-4">
            <div className="max-w-4xl mx-auto px-6 py-6">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="flex-1">
                  <input
                    ref={(el) => { inputRef.current = el; }}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:border-orange-500 text-base"
                    placeholder="Describe what you're looking for..."
                    disabled={loading}
                    aria-label="Describe your apartment search requirements"
                    aria-describedby="search-help"
                  />
                  <div id="search-help" className="sr-only">
                    Describe your apartment needs including budget, location, size, and amenities. For example: &quot;2 bedroom apartment near ELTE university under 150,000 HUF&quot;
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-medium transition disabled:opacity-50 min-h-[44px] flex-shrink-0"
                  disabled={loading || !query.trim()}
                  aria-label={loading ? "Searching for apartments" : "Search for apartments"}
                >
                  {loading ? '⏳' : '🔍 Search'}
                </button>
              </form>
            </div>
          </div>
        </>
      ) : (
        /* Grid view with minimized floating chat */
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col">
            <div className="max-w-7xl mx-auto w-full">
              {userWishedFeatures.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    ✨ Your Preferences ({userWishedFeatures.length} features)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {userWishedFeatures.map(f => (
                      <span key={f.id} className="text-xs bg-white px-2 py-1 rounded border border-yellow-300">
                        {f.icon} {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4 flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="match">Best Match</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="bedrooms">Most Bedrooms</option>
                </select>
                <span className="text-sm text-gray-600 ml-auto">{displayedResults.length} results</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedResults.map((apt: any) => {
                  const apartmentFeatures: string[] = Array.isArray(apt.featureTags)
                    ? apt.featureTags
                    : [];

                  if (apartmentFeatures.length === 0) {
                    if (apt.pet_friendly) apartmentFeatures.push('amen_pet_friendly');
                    if (apt.parking_available) apartmentFeatures.push('loc_parking_street');
                    if (apt.internet_included) apartmentFeatures.push('amen_internet');
                    if (apt.laundry_in_unit) apartmentFeatures.push('amen_washing_machine');
                    if (apt.elevator) apartmentFeatures.push('amen_elevator');

                    if (Array.isArray(apt.amenities)) {
                      apt.amenities.forEach((amenity: string) => {
                        const amenityLower = amenity.toLowerCase();
                        if (amenityLower.includes('balcony')) apartmentFeatures.push('amen_balcony');
                        if (amenityLower.includes('terrace')) apartmentFeatures.push('amen_terrace');
                        if (amenityLower.includes('garden')) apartmentFeatures.push('amen_garden');
                        if (amenityLower.includes('furnished')) apartmentFeatures.push('amen_furnished');
                        if (amenityLower.includes('air conditioning') || amenityLower.includes('ac')) apartmentFeatures.push('amen_ac');
                        if (amenityLower.includes('heating')) apartmentFeatures.push('amen_heating');
                        if (amenityLower.includes('dishwasher')) apartmentFeatures.push('amen_dishwasher');
                        if (amenityLower.includes('gym')) apartmentFeatures.push('loc_gym');
                        if (amenityLower.includes('pool')) apartmentFeatures.push('amen_pool');
                      });
                    }
                    if (apt.distance_to_metro_m && apt.distance_to_metro_m < 1000) apartmentFeatures.push('loc_metro');
                    if (apt.distance_to_university_m && apt.distance_to_university_m < 2000) apartmentFeatures.push('loc_university');
                  }

                  const matchedFeatures = userWishedFeatures.filter(f => apartmentFeatures.includes(f.id));
                  const userScoreRaw = apt.aiScore ?? apt.featureMatchScore ?? 50;
                  const userScore = Math.max(0, Math.min(100, Math.round(userScoreRaw)));
                  const scoreColor = userScore >= 80 ? 'bg-green-500' : userScore >= 60 ? 'bg-yellow-500' : 'bg-orange-500';

                  const explainReasons = buildExplainReasons(apt.aiReasons, matchedFeatures);
                  const compromiseList = Array.isArray(apt.aiCompromises) ? apt.aiCompromises.filter(Boolean).slice(0, 2) : [];
                  const commuteMinutes = typeof apt.distance_to_university_m === 'number'
                    ? Math.round(apt.distance_to_university_m / 80)
                    : null;
                  const priceValue =
                    typeof apt.price_huf === 'number'
                      ? apt.price_huf
                      : typeof apt.price_huf === 'string' && !Number.isNaN(Number(apt.price_huf))
                        ? Number(apt.price_huf)
                        : typeof apt.price === 'number'
                          ? apt.price
                          : typeof apt.price === 'string' && !Number.isNaN(Number(apt.price))
                            ? Number(apt.price)
                            : null;
                  const priceLabel = priceValue ? `${priceValue.toLocaleString()} HUF` : 'Price on request';
                  const districtLabel = apt.district ? `District ${apt.district}` : 'District -';
                  const bedroomLabel = typeof apt.bedrooms === 'number'
                    ? `${apt.bedrooms} bed${apt.bedrooms > 1 ? 's' : ''}`
                    : 'Beds -';
                  const bathroomLabel = typeof apt.bathrooms === 'number'
                    ? `${apt.bathrooms} bath${apt.bathrooms > 1 ? 's' : ''}`
                    : 'Baths -';

                  return (
                    <div
                      key={apt.id}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-200"
                    >
                      <a
                        href={`/apartments/${apt.id}`}
                        className="relative h-48 bg-gray-200 cursor-pointer block"
                      >
                        {apt.image_urls && apt.image_urls[0] ? (
                          <img src={apt.image_urls[0]} alt={apt.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-4xl font-semibold">SA</span>
                          </div>
                        )}
                        <div className={`absolute top-3 right-3 ${scoreColor} text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg`}>
                          {userScore}% Match
                        </div>
                      </a>

                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <a
                            href={`/apartments/${apt.id}`}
                            className="font-bold text-gray-900 text-lg hover:text-orange-600 transition-colors"
                          >
                            {apt.title || apt.address || 'Apartment'}
                          </a>
                          <span className="text-orange-600 font-bold text-lg whitespace-nowrap ml-2">
                            {priceLabel}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span>{districtLabel}</span>
                          <span>• {bedroomLabel}</span>
                          <span>• {bathroomLabel}</span>
                          {apt.size_sqm && <span>• {apt.size_sqm} sqm</span>}
                        </div>
                        {commuteMinutes !== null && (
                          <div className="text-xs text-gray-500">≈ {commuteMinutes} min to campus</div>
                        )}

                        {matchedFeatures.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">Preferences matched</div>
                            <div className="flex flex-wrap gap-1.5">
                              {matchedFeatures.slice(0, 4).map(f => (
                                <span key={f.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                  {f.icon} {f.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {explainReasons.length > 0 && (
                          <ExplainWhy
                            reasons={explainReasons}
                            title="AI says this fits because"
                            className="bg-transparent border-0 shadow-none p-0"
                          />
                        )}

                        {compromiseList.length > 0 && (
                          <div className="text-xs text-gray-500">
                            <span className="font-medium text-gray-700">Keep in mind:</span>
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                              {compromiseList.map((item: string, idx: number) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleWhyThisClick(apt, { matchedFeatures, matchScore: userScore, aiReasons: explainReasons })}
                            className="flex-1 text-sm px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition min-h-[44px]"
                          >
                            Why this?
                          </button>
                          <a
                            href={`/apartments/${apt.id}`}
                            className="flex-1 text-sm px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition text-center min-h-[44px]"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {currentResults.length > resultsPerPage && (
                <div className="mt-6 mb-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition min-h-[44px]"
                  >
                    ← Previous
                  </button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.ceil(currentResults.length / resultsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(currentResults.length / resultsPerPage);
                        // Show first page, last page, current page, and pages around current
                        return page === 1 || 
                               page === totalPages || 
                               (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, index, arr) => (
                          <Fragment key={page}>
                          {index > 0 && arr[index - 1] !== page - 1 && (
                            <span className="px-2 py-2 text-gray-500">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-4 py-3 rounded-lg transition min-h-[44px] ${
                              currentPage === page 
                                ? 'bg-orange-500 text-white' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                          </Fragment>
                      ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(currentResults.length / resultsPerPage), currentPage + 1))}
                    disabled={currentPage === Math.ceil(currentResults.length / resultsPerPage)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition min-h-[44px]"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel - Fixed at bottom */}
          <div 
            className="bg-white border-t shadow-2xl flex-shrink-0 transition-all duration-300"
            style={{ 
              maxHeight: chatExpanded ? '550px' : '120px',
            }}
            onMouseEnter={() => !chatExpanded && setChatHovered(true)}
            onMouseLeave={() => !chatExpanded && setChatHovered(false)}
          >
            {/* Chat history - only visible when expanded or hovered */}
            {messages.length > 0 && (chatExpanded || chatHovered) && (
              <div className="px-6 py-2 border-b bg-gray-50 max-h-56 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between sticky top-0 bg-gray-50">
                  <span>💬 Chat ({messages.length})</span>
                  <button 
                    onClick={() => setChatExpanded(!chatExpanded)}
                    className="text-xs px-2 py-1 bg-white hover:bg-gray-200 text-gray-700 rounded border transition"
                  >
                    {chatExpanded ? 'Collapse ▲' : 'Expand ▼'}
                  </button>
                </div>
                <div className="space-y-2">
                  {(chatExpanded ? messages : messages.slice(-3)).map((msg) => (
                    <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} text-xs`}>
                      {msg.from === 'ai' && (
                        <div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center mr-2 flex-shrink-0 text-xs font-bold">AI</div>
                      )}
                      <div className={`max-w-xs px-2 py-1 rounded ${
                        msg.from === 'user' ? 'bg-orange-500 text-white rounded-br-none' : 
                        msg.from === 'ai' ? 'bg-gray-200 text-gray-900 rounded-bl-none' : 
                        'bg-yellow-100 text-yellow-900'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input box - ALWAYS VISIBLE */}
            <div className="px-6 py-3">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setChatHovered(true)}
                  className="flex-1 border-2 border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
                  placeholder="Tell me what you're looking for..."
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full transition disabled:opacity-50 font-medium text-sm flex-shrink-0"
                  disabled={loading || !query.trim()}
                >
                  {loading ? '⏳' : '🔍'}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setCurrentResults([]);
                    setDisplayedResults([]);
                    setMessages([]);
                    setFollowUps([]);
                    setAskedQuestions([]);
                    setUserWishedFeatures([]);
                    setChatExpanded(false);
                    setCurrentPage(1);
                    localStorage.removeItem('chatSearch_results');
                    localStorage.removeItem('chatSearch_messages');
                    localStorage.removeItem('chatSearch_features');
                  }}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition text-lg flex-shrink-0 font-bold"
                  title="Return to home and clear search"
                >
                  🏠
                </button>
              </form>

              {/* Follow-up suggestions - only when expanded */}
              {followUps.length > 0 && chatExpanded && (
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-2">💡 Suggestions:</div>
                  <div className="flex flex-wrap gap-2">
                    {followUps.map((q, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSubmit(undefined, q)} 
                        className="text-xs bg-gray-100 hover:bg-orange-50 px-2 py-1 rounded border hover:border-orange-300 transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal for "Why this?" explanation */}
      <ApartmentExplanationModal 
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalReasons([]);
        }}
        explanation={modalExplanation}
        apartmentTitle={modalApartmentTitle}
        matchScore={modalMatchScore}
        reasons={modalReasons}
      />
    </div>
  );
}



















