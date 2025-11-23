'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
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

type Message = {
  id: string;
  from: 'user' | 'ai' | 'system';
  text: string;
};

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
  const resultsPerPage = 12;
  const chatRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // Load cached data on mount
  useEffect(() => {
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
    }
  }, [currentResults]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatSearch_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (userWishedFeatures.length > 0) {
      localStorage.setItem('chatSearch_features', JSON.stringify(userWishedFeatures));
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

  const handleWhyThisClick = (apartment: any) => {
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
    const explanation = generateIntelligentMatchExplanation(
      profile,
      apartment,
      apartment.matchedFeatures || []
    );

    pushMessage('ai', explanation);
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
    console.log('🔍 Fetching with filters:', filters);
    let query = supabase.from('apartments').select('*');

    if (filters.bedrooms) {
      console.log('✅ Filtering bedrooms >=', filters.bedrooms);
      query = query.gte('bedrooms', filters.bedrooms);
    }
    if (filters.minPrice) {
      console.log('✅ Filtering minPrice >=', filters.minPrice);
      query = query.gte('price_huf', filters.minPrice);
    }
    if (filters.maxPrice) {
      console.log('✅ Filtering maxPrice <=', filters.maxPrice);
      query = query.lte('price_huf', filters.maxPrice);
    }
    if (filters.district) {
      console.log('✅ Filtering district =', filters.district);
      query = query.eq('district', filters.district);
    }
    if (filters.search) {
      console.log('✅ Searching for:', filters.search);
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    console.log(`📦 Found ${data?.length || 0} apartments from database`);
    return data || [];
  };

  const runSearchFlow = async (story: string) => {
    setLoading(true);
    const sanitizedStory = sanitizeUserInput(story);
    pushMessage('user', sanitizedStory);
    
    if (!isOnline) {
      pushMessage('ai', '📱 You are currently offline. Showing your previous search results...');
      // Show cached results if available
      const cachedResults = localStorage.getItem('chatSearch_results');
      if (cachedResults) {
        try {
          const results = JSON.parse(cachedResults);
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
        body: JSON.stringify({ story: sanitizedStory })
      });
      
      if (response.ok) {
        const { analysis } = await response.json();
        console.log('✅ Gemini AI response:', analysis);
        Object.assign(localParse, analysis);
        pushMessage('system', '🤖 AI analysis complete');
      } else {
        throw new Error('AI API request failed');
      }
    } catch (err) {
      console.error('❌ Gemini AI failed:', err);
      pushMessage('system', '⚠️ Using local parsing (AI unavailable)');
    }

    let apartments = await fetchApartments(localParse);
    
    // Early return if no apartments found
    if (!apartments || apartments.length === 0) {
      pushMessage('ai', `❌ No apartments found matching your criteria. Try:\n- Increasing your budget\n- Removing specific location requirements\n- Reducing the number of bedrooms`);
      setLoading(false);
      return;
    }

    let scored = apartments.map(apt => {
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
      };
    });

    // Sort by feature score first to get best candidates for AI scoring
    scored.sort((a, b) => b.featureMatchScore - a.featureMatchScore);

    // Apply AI scoring to top candidates
    try {
      console.log('🤖 Starting AI scoring for top', Math.min(20, scored.length), 'apartments...');
      const topCandidates = scored.slice(0, Math.min(20, scored.length));
      
      let aiSuccessCount = 0;
      
      // Score apartments in parallel for much faster performance
      const scoringPromises = topCandidates.map(async (apt) => {
        try {
          const response = await fetch('/api/ai/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              apartment: {
                id: apt.id,
                title: apt.title,
                price: typeof apt.price_huf === 'number' ? apt.price_huf : parseInt(apt.price_huf) || 0,
                location: apt.address || `District ${apt.district}`,
                features: [], // We'll populate this later
                amenities: apt.amenities || [],
                size: apt.size_sqm,
                rooms: apt.bedrooms
              }, 
              userPreferences: localParse
            })
          });
          
          if (response.ok) {
            const { result } = await response.json();
            aiSuccessCount++;
            return { ...apt, aiScore: result.score };
          } else {
            throw new Error('AI scoring API failed');
          }
        } catch (err) {
          console.warn('⚠️ AI scoring failed for apartment:', apt.id, err);
          return { ...apt, aiScore: apt.featureMatchScore ?? 50 };
        }
      });

      // Wait for all scoring to complete in parallel
      const scoringResults = await Promise.allSettled(scoringPromises);
      const scoredWithAI = scoringResults.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      );
      
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
        setFollowUps(questions);
      } else {
        throw new Error('Follow-up API failed');
      }
    } catch (err) {
      console.warn('⚠️ Follow-up questions failed:', err);
      setFollowUps([
        'Is your budget per person or total?',
        'Modern or traditional style?',
        'How important is proximity to public transport?'
      ]);
    }

    setLoading(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;
    const sanitizedQuery = sanitizeUserInput(query.trim());
    await runSearchFlow(sanitizedQuery);
    setQuery('');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {currentResults.length === 0 ? (
        /* Full-screen chat mode when no results */
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6" ref={chatRef}>
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💬</div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Start your apartment search</h2>
                  <p className="text-gray-600 mb-6">Tell me your story</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <button 
                      onClick={() => setQuery("I'm a student at ELTE with 100k budget, want modern apartment near metro")}
                      className="p-4 bg-orange-50 hover:bg-orange-100 rounded-xl text-left border border-orange-200 transition"
                    >
                      <div className="font-medium text-gray-900 mb-1">🎓 Student</div>
                      <div className="text-sm text-gray-600">&ldquo;Student at ELTE, 100k budget...&rdquo;</div>
                    </button>
                    <button 
                      onClick={() => setQuery("Looking for 2BR with balcony, quiet, budget 150k")}
                      className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-left border border-blue-200 transition"
                    >
                      <div className="font-medium text-gray-900 mb-1">💑 Couple</div>
                      <div className="text-sm text-gray-600">&ldquo;2BR with balcony...&rdquo;</div>
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

          <div className="border-t bg-white shadow-lg">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  ref={(el) => { inputRef.current = el; }}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="flex-1 border-2 border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:border-orange-500"
                  placeholder="Describe what you're looking for..."
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-medium transition disabled:opacity-50"
                  disabled={loading || !query.trim()}
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
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {userWishedFeatures.length > 0 && (
              <div className="max-w-7xl mx-auto mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-semibold text-gray-800 mb-2">
                  ✨ Your Preferences ({userWishedFeatures.length} features)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {userWishedFeatures.slice(0, 10).map(f => (
                    <span key={f.id} className="text-xs bg-white px-2 py-1 rounded border border-yellow-300">
                      {f.icon} {f.name}
                    </span>
                  ))}
                  {userWishedFeatures.length > 10 && <span className="text-xs text-gray-500">+{userWishedFeatures.length - 10} more</span>}
                </div>
              </div>
            )}

            <div className="max-w-7xl mx-auto mb-4 flex items-center gap-4 px-2">
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

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedResults.map((apt: any) => {
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
                
                const userFeatureIds = userWishedFeatures.map(f => f.id);
                const matchedFeatures = userWishedFeatures.filter(f => apartmentFeatures.includes(f.id));
                const userScore = Math.round(apt.aiScore ?? apt.featureMatchScore ?? Math.floor(Math.random() * 40) + 40); // Random score between 40-80 when no data
                const scoreColor = userScore >= 80 ? 'bg-green-500' : userScore >= 50 ? 'bg-yellow-500' : 'bg-orange-500';
                
                return (
                  <div 
                    key={apt.id} 
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-200"
                  >
                    <div 
                      className="relative h-48 bg-gray-200 cursor-pointer"
                      onClick={() => window.location.href = `/apartments/${apt.id}`}
                    >
                      {apt.image_urls && apt.image_urls[0] ? (
                        <img src={apt.image_urls[0]} alt={apt.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-5xl">🏠</span>
                        </div>
                      )}
                      <div className={`absolute top-3 right-3 ${scoreColor} text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg`}>
                        {userScore}% Match
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 
                          className="font-bold text-gray-900 text-lg cursor-pointer hover:text-orange-600 transition-colors"
                          onClick={() => window.location.href = `/apartments/${apt.id}`}
                        >
                          {apt.title || apt.address || 'Apartment'}
                        </h3>
                        <span className="text-orange-600 font-bold text-lg whitespace-nowrap ml-2">
                          {apt.price_huf || apt.price} HUF
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        📍 District {apt.district || '?'} • 🛏️ {apt.bedrooms || '?'} beds
                      </div>

                      {matchedFeatures.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-700 mb-1">Matched:</div>
                          <div className="flex flex-wrap gap-1">
                            {matchedFeatures.slice(0, 3).map(f => (
                              <span key={f.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                ✓ {f.icon} {f.name}
                              </span>
                            ))}
                            {matchedFeatures.length > 3 && <span className="text-xs text-gray-500">+{matchedFeatures.length - 3}</span>}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleWhyThisClick(apt)}
                          className="flex-1 text-sm px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition"
                        >
                          Why this?
                        </button>
                        <a
                          href={`/apartments/${apt.id}`}
                          className="flex-1 text-sm px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition text-center"
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
              <div className="max-w-7xl mx-auto mt-6 mb-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition"
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
                          className={`px-3 py-2 rounded-lg transition ${
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
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Invisible hover zone above chat - only triggers when mouse is very close */}
          <div 
            className="absolute bottom-full left-0 right-0 h-8 bg-transparent"
            onMouseEnter={() => setChatHovered(true)}
            onMouseLeave={() => !chatExpanded && setChatHovered(false)}
          />

          <div 
            className="bg-white border-t shadow-2xl transition-all duration-300 relative"
            style={{ 
              maxHeight: chatExpanded ? '550px' : chatHovered ? '280px' : '180px', // Increased default height from 70px to 180px
            }}
          >
            <div className="max-w-7xl mx-auto px-6 py-3">
              
              {/* Chat History - ALWAYS VISIBLE ABOVE INPUT */}
              {messages.length > 0 && (
                <div className={`mb-3 transition-all duration-300 ${chatHovered || chatExpanded ? 'max-h-48' : 'max-h-32'} overflow-y-auto`}>
                  <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
                    <span>💬 Chat History ({messages.length})</span>
                    <button 
                      onClick={() => {
                        setChatExpanded(!chatExpanded);
                        setManuallyExpanded(!chatExpanded); // Track manual expansion
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                    >
                      {chatExpanded ? 'Collapse ▲' : 'Expand ▼'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(chatExpanded ? messages : messages.slice(-6)).map((msg) => ( // Show last 6 messages by default instead of 3
                      <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.from === 'ai' && (
                          <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center mr-2 flex-shrink-0 text-xs font-bold">AI</div>
                        )}
                        <div className={`max-w-sm px-2 py-1.5 rounded-lg text-xs ${msg.from === 'user' ? 'bg-orange-500 text-white rounded-br-sm' : msg.from === 'ai' ? 'bg-gray-100 text-gray-900 rounded-bl-sm' : 'bg-yellow-50 text-yellow-900 border border-yellow-200'}`}>
                          <div className="line-clamp-2">{msg.text}</div>
                        </div>
                        {msg.from === 'user' && (
                          <div className="w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center ml-2 flex-shrink-0 text-xs font-bold">You</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input box - ALWAYS VISIBLE on hover/expanded */}
              <div className={`transition-all duration-300 ${(chatHovered || chatExpanded) ? 'mb-4' : 'mb-0'}`}>
                <div className="flex gap-3 items-center">
                  <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      className="flex-1 border-2 border-gray-300 rounded-full px-5 py-3 text-base focus:outline-none focus:border-orange-500 shadow-sm"
                      placeholder={chatHovered ? "Continue your search..." : "Refine your search..."}
                      disabled={loading}
                      autoFocus={chatHovered}
                    />
                    <button 
                      type="submit" 
                      className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3 rounded-full transition disabled:opacity-50 font-medium flex items-center gap-2"
                      disabled={loading || !query.trim()}
                    >
                      {loading ? '⏳' : '🔍 Search'}
                      {!isOnline && <span className="text-xs">📱</span>}
                    </button>
                  </form>
                  
                  {!isOnline && (
                    <div className="text-xs text-orange-600 font-medium flex items-center gap-1">
                      <span>📱</span>
                      Offline - Showing cached results
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      setCurrentResults([]);
                      setMessages([]);
                      setFollowUps([]);
                      setUserWishedFeatures([]);
                    }}
                    className="text-sm px-4 py-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-full transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Follow-up suggestions - only when expanded */}
              {followUps.length > 0 && chatExpanded && (
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-2">💡 Suggestions:</div>
                  <div className="flex flex-wrap gap-2">
                    {followUps.map((q, i) => (
                      <button 
                        key={i}
                        onClick={() => { setQuery(q); handleSubmit(); }} 
                        className="text-xs bg-gray-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg border hover:border-orange-300 transition"
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
    </div>
  );
}
