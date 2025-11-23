'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import {
  getPersonalityAssessment,
  connectPersonalityAssessment,
  getPersonalityBasedRecommendations
} from '@/utils/personality-assessment';
import {
  analyzeUserStory,
  generateFollowUpQuestions,
  calculateSuitabilityScore,
  generatePersonalizedDescription
} from '@/utils/gemini';
import {
  matchFeaturesFromStory,
  calculateFeatureMatchScore,
  FeatureIcon
} from '@/utils/feature-icons';
import {
  detectArchetypeFromStory,
  getArchetypeMatchScore,
  PersonalityArchetype
} from '@/utils/personality-archetypes';

export default function NaturalLanguageSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [partnerMode, setPartnerMode] = useState(false);
  const [partnerQuery, setPartnerQuery] = useState('');
  const [userArchetype, setUserArchetype] = useState<PersonalityArchetype | null>(null);
  const [partnerArchetype, setPartnerArchetype] = useState<PersonalityArchetype | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; from: 'user' | 'ai' | 'system'; text: string }>>([]);
  const [results, setResults] = useState<any[]>([]);
  const [personality, setPersonality] = useState<any | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [userWishedFeatures, setUserWishedFeatures] = useState<FeatureIcon[]>([]);
  const router = useRouter();
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll chat to bottom when messages update
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, results]);

  // Helper: append message
  const pushMessage = (from: 'user' | 'ai' | 'system', text: string) => {
    setMessages(m => [...m, { id: String(Date.now()) + Math.random().toString(16).slice(2,8), from, text }]);
  };

  // Basic local parser (keeps previous logic) - extracted for reuse
  const parseNaturalLanguage = (text: string) => {
    const lower = text.toLowerCase();
    const result: any = {};

    // Bedrooms
    const bedroomMatch = lower.match(/(\d+)[\s-]*(?:bedroom|bed|br|room)/);
    if (bedroomMatch) result.bedrooms = parseInt(bedroomMatch[1]);
    else if (lower.includes('studio')) result.bedrooms = 1;

    // Price
    const priceMatch = lower.match(/(?:under|below|max|up to)\s*[~€]?\s*(\d+)(?:k|000|,000)?/);
    if (priceMatch) {
      const price = parseInt(priceMatch[1]);
      result.maxPrice = price > 1000 ? price : price * 1000;
    }

    const minPriceMatch = lower.match(/(?:over|above|min|from|at least)\s*(\d+)(?:k|000|,000)?/);
    if (minPriceMatch) {
      const price = parseInt(minPriceMatch[1]);
      result.minPrice = price > 1000 ? price : price * 1000;
    }

    // District
    const districtMatch = lower.match(/district\s*(\d+)/);
    if (districtMatch) result.district = parseInt(districtMatch[1]);

    // Keywords
    const keywords: string[] = [];
    ['furnished','balcony','elevator','wifi','parking','pet','bright','quiet','cozy','modern','renovated','studio','private'].forEach(k => { if (lower.includes(k)) keywords.push(k); });
    if (keywords.length) result.search = keywords.join(' ');

    return result;
  };

  // Fetch apartments from Supabase with basic filters and text search
  const fetchApartments = async (filters: any) => {
    let query = supabase.from('apartments').select('*');

    if (filters.bedrooms) {
      query = query.gte('bedrooms', filters.bedrooms);
    }
    if (filters.minPrice) {
      query = query.gte('price_huf', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('price_huf', filters.maxPrice);
    }
    if (filters.district) {
      query = query.eq('district', filters.district);
    }

    // Basic full text-ish search on description/title/features
    if (filters.search) {
      // Use ilike to search in title or description fields
      const q = `%${filters.search.replace(/%/g, '')}%`;
      query = query.or(`title.ilike.${q},description.ilike.${q}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) {
      console.error('Failed to fetch apartments', error);
      return [];
    }

    return data || [];
  };

  // Main search flow: analyze story, get apartments, score them
  const runSearchFlow = async (story: string, isPartner: boolean = false) => {
    setLoading(true);
    pushMessage('user', story);

    // Local parse first for immediate filters
    const localParse = parseNaturalLanguage(story);

    // Extract features from user's story (200 feature icons system)
    const wishedFeatures = matchFeaturesFromStory(story);
    if (!isPartner) {
      setUserWishedFeatures(wishedFeatures);
    }
    
    if (wishedFeatures.length > 0) {
      const featureNames = wishedFeatures.slice(0, 5).map(f => f.name).join(', ');
      pushMessage('system', `✨ Detected ${isPartner ? "partner's" : 'your'} wishes: ${featureNames}${wishedFeatures.length > 5 ? ` +${wishedFeatures.length - 5} more` : ''}`);
    }

    // Detect personality archetype from story
    const archetype = detectArchetypeFromStory(story);
    if (archetype) {
      if (isPartner) {
        setPartnerArchetype(archetype);
        pushMessage('system', `🎯 Partner archetype: ${archetype.emoji} ${archetype.name}`);
      } else {
        setUserArchetype(archetype);
        pushMessage('system', `🎯 Your archetype: ${archetype.emoji} ${archetype.name} - ${archetype.description}`);
      }
    }

    // Show quick placeholder ai response
    pushMessage('ai', 'Got it — searching for matches now. I may ask a couple quick questions to refine the results.');

    // Try to get personality data (mock API)
    let personalityData = null;
    let userId = null;
    try {
      // Assume current user id is stored in localStorage 'supabase.auth.token' or similar for demo
      userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const p = await getPersonalityAssessment(userId);
        if (p) {
          personalityData = p;
          setPersonality(p);
          pushMessage('system', 'Loaded your personality assessment to personalize results.');
        }
      }
    } catch (err) {
      // ignore
      // ignore
      console.warn('Personality load failed', err);
    }

    // Fetch apartments via Supabase
    const apartments = await fetchApartments({ bedrooms: localParse.bedrooms, minPrice: localParse.minPrice, maxPrice: localParse.maxPrice, district: localParse.district, search: localParse.search });

    // If we have personality data, generate personality-based recommendations
    let scored: any[] = [];
    if (personalityData && userId) {
      const personalityScores = await getPersonalityBasedRecommendations(userId, apartments);
      // Map into scored list and sort
      scored = personalityScores.map((p: any) => ({ ...p.apartment, personalityScore: p.personalityScore, personalityReasons: p.reasons })).sort((a: any, b: any) => b.personalityScore - a.personalityScore);
    } else {
      // Simple heuristic scoring without personality
      scored = apartments.map((apt: any) => ({ ...apt, personalityScore: 50 }));
    }

    // Add archetype-based scoring for user
    if (archetype && !isPartner) {
      scored = scored.map(apt => {
        const apartmentFeatures = apt.feature_ids || [];
        const archetypeMatch = getArchetypeMatchScore(archetype, apartmentFeatures);
        return {
          ...apt,
          archetypeScore: archetypeMatch.score,
          archetypeReasons: archetypeMatch.reasons,
          archetypeConcerns: archetypeMatch.concerns
        };
      });
    }

    // Add partner archetype scoring if in partner mode
    if (partnerArchetype && partnerMode) {
      scored = scored.map(apt => {
        const apartmentFeatures = apt.feature_ids || [];
        const partnerMatch = getArchetypeMatchScore(partnerArchetype, apartmentFeatures);
        return {
          ...apt,
          partnerScore: partnerMatch.score,
          partnerReasons: partnerMatch.reasons,
          partnerConcerns: partnerMatch.concerns,
          // Compatibility score: average of user and partner scores
          compatibilityScore: ((apt.archetypeScore || apt.personalityScore || 50) + partnerMatch.score) / 2
        };
      });
    }

    // If Gemini is available, ask it to calculate suitability scores (best-effort)
    try {
      const scoredWithAI: any[] = [];
      for (const apt of scored.slice(0, 20)) {
        try {
          const res = await calculateSuitabilityScore(apt, localParse, personalityData);
          scoredWithAI.push({ ...apt, aiScore: res.score, aiReasons: res.reasons, compromises: res.compromises });
        } catch (err) {
          // fallback to existing score
          scoredWithAI.push({ ...apt, aiScore: apt.personalityScore ?? 50, aiReasons: apt.personalityReasons ?? [] });
        }
      }

      // Sort by appropriate score (compatibility if partner mode, otherwise AI/archetype)
      scoredWithAI.sort((a, b) => {
        const scoreA = partnerMode ? (a.compatibilityScore || a.aiScore || 0) : (a.aiScore || a.archetypeScore || 0);
        const scoreB = partnerMode ? (b.compatibilityScore || b.aiScore || 0) : (b.aiScore || b.archetypeScore || 0);
        return scoreB - scoreA;
      });
      setResults(scoredWithAI);

    } catch (err) {
      // If AI scoring fails, use local scores
      setResults(scored);
    }

    // Generate follow-up questions using Gemini utility, but fallback to simple questions
    try {
      const follow = await generateFollowUpQuestions(story, localParse, askedQuestions);
      setFollowUps(follow);
    } catch (err) {
      setFollowUps([
        'Is your 100k HUF budget per person or total for the apartment?',
        'How important is privacy vs social spaces (rate 1-5)?',
        'Do you prefer modern or traditional styles?'
      ]);
    }

    pushMessage('ai', `Found ${Math.min(50, results.length || scored.length)} candidate apartments — you can refine by answering a question or typing more of your story.`);
    setLoading(false);
  };

  // Handle submit from input
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    await runSearchFlow(query.trim());
  };

  // Handle follow-up answer with real-time re-ranking
  const answerFollowUp = async (question: string) => {
    setAskedQuestions(q => [...q, question]);
    pushMessage('user', question);
    
    // Extract additional preferences from answer
    const additionalFeatures = matchFeaturesFromStory(question);
    if (additionalFeatures.length > 0) {
      setUserWishedFeatures(prev => {
        const combined = [...prev];
        additionalFeatures.forEach(f => {
          if (!combined.find(existing => existing.id === f.id)) {
            combined.push(f);
          }
        });
        return combined;
      });
      
      pushMessage('system', `✨ Added ${additionalFeatures.length} more preferences`);
    }
    
    // Re-rank results in real-time
    if (results.length > 0) {
      setLoading(true);
      pushMessage('ai', 'Updating results based on your answer...');
      
      // Re-score with updated preferences
      const updatedResults = results.map(apt => {
        const apartmentFeatures = apt.feature_ids || [];
        const allUserFeatures = [...userWishedFeatures, ...additionalFeatures].map(f => f.id);
        const newFeatureScore = calculateFeatureMatchScore(apartmentFeatures, allUserFeatures);
        
        // Update archetype score if applicable
        let newArchetypeScore = apt.archetypeScore;
        if (userArchetype) {
          const archetypeMatch = getArchetypeMatchScore(userArchetype, apartmentFeatures);
          newArchetypeScore = archetypeMatch.score;
        }
        
        // Recalculate combined score
        const newCombinedScore = (newFeatureScore * 0.4) + ((newArchetypeScore || apt.aiScore || 50) * 0.6);
        
        return {
          ...apt,
          featureMatchScore: newFeatureScore,
          archetypeScore: newArchetypeScore,
          aiScore: newCombinedScore,
          _justUpdated: true // Flag for animation
        };
      });
      
      // Sort by new scores
      const sortKey = partnerMode ? 'compatibilityScore' : 'aiScore';
      updatedResults.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
      
      setResults(updatedResults);
      
      // Remove animation flag after 2 seconds
      setTimeout(() => {
        setResults(prev => prev.map(r => ({ ...r, _justUpdated: false })));
      }, 2000);
      
      pushMessage('ai', 'Results updated! Apartments are now re-ranked based on your new preferences.');
      setLoading(false);
    }
  };

  // Quick connect personality button (mock)
  const handleConnectPersonality = async () => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        pushMessage('system', 'Please log in to connect your personality profile.');
        return;
      }
      const ok = await connectPersonalityAssessment(userId, 'mock-token');
      if (ok) {
        const p = await getPersonalityAssessment(userId);
        setPersonality(p);
        pushMessage('system', 'Personality assessment connected successfully.');
      }
    } catch (err) {
      pushMessage('system', 'Failed to connect personality assessment.');
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Chat / Story Input */}
        <div className="flex-1 bg-white rounded-lg p-4 shadow">
          <h4 className="font-bold mb-2">Tell your story</h4>
          <div ref={listRef} className="h-64 overflow-auto border rounded p-3 bg-gray-50">
            {messages.length === 0 && <div className="text-gray-500">Type your story and press Search — the AI will ask follow-ups if needed.</div>}
            {messages.map(m => (
              <div key={m.id} className={`mb-2 ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-3 py-2 rounded ${m.from === 'user' ? 'bg-orange-600 text-white' : m.from === 'system' ? 'bg-gray-200 text-gray-800' : 'bg-blue-50 text-blue-900'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Write your story, e.g. 'Student at ELTE, 100k budget, want to live with girlfriend in a private beautiful space'"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded">{loading ? 'Searching...' : 'Search'}</button>
          </form>

          {/* Partner Mode Toggle */}
          <div className="mt-3 flex gap-2 items-center flex-wrap">
            <button 
              onClick={() => setPartnerMode(!partnerMode)} 
              className={`text-sm px-3 py-1 rounded ${partnerMode ? 'bg-pink-100 text-pink-700' : 'bg-gray-100'}`}
            >
              {partnerMode ? '💑 Partner Mode ON' : '👤 Solo Search'}
            </button>
            {partnerMode && (
              <div className="flex gap-2 items-center flex-1">
                <input
                  value={partnerQuery}
                  onChange={e => setPartnerQuery(e.target.value)}
                  placeholder="Partner's wishes (e.g., 'I want quiet space with home office')"
                  className="flex-1 px-3 py-1 text-sm border rounded"
                />
                <button 
                  onClick={async () => {
                    if (partnerQuery.trim()) {
                      await runSearchFlow(partnerQuery.trim(), true);
                      setPartnerQuery('');
                    }
                  }}
                  className="text-sm px-3 py-1 bg-pink-600 text-white rounded"
                >
                  Add Partner
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 flex gap-2 items-center">
            <button onClick={handleConnectPersonality} className="text-sm px-3 py-1 bg-gray-100 rounded">Connect Personality</button>
            <span className="text-xs text-gray-500">{personality ? 'Personality connected' : 'No personality connected'}</span>
          </div>

          {/* Follow-up suggestions */}
          {followUps.length > 0 && (
            <div className="mt-3">
              <h5 className="text-sm font-semibold mb-1">Quick questions to refine results</h5>
              <div className="flex flex-wrap gap-2">
                {followUps.map((q, i) => (
                  <button key={i} onClick={() => { setQuery(q); pushMessage('user', q); }} className="text-sm bg-white/90 px-3 py-1 rounded border">{q}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="w-full md:w-1/2 bg-white rounded-lg p-4 shadow overflow-auto">
          <h4 className="font-bold mb-2">Matches</h4>
          
          {/* User's wished features display */}
          {userWishedFeatures.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h5 className="text-sm font-semibold text-gray-800 mb-2">✨ Your Wishes ({userWishedFeatures.length} features)</h5>
              <div className="flex flex-wrap gap-1.5">
                {userWishedFeatures.slice(0, 12).map(f => (
                  <span key={f.id} className="text-xs bg-white px-2 py-1 rounded border border-yellow-300" title={f.description}>
                    {f.icon} {f.name}
                  </span>
                ))}
                {userWishedFeatures.length > 12 && (
                  <button 
                    onClick={() => {
                      const allFeatures = userWishedFeatures.map(f => `${f.icon} ${f.name}`).join(', ');
                      pushMessage('system', `All your wishes: ${allFeatures}`);
                    }}
                    className="text-xs text-orange-600 underline px-2"
                  >
                    +{userWishedFeatures.length - 12} more
                  </button>
                )}
              </div>
            </div>
          )}
          
          {results.length === 0 && <div className="text-gray-500">No results yet. Try typing your story and searching.</div>}

          <div className="space-y-3">
            {results.map((apt: any) => {
              // Mock apartment features (in production, these would come from database)
              const apartmentFeatures = apt.feature_ids || [];
              const userFeatureIds = userWishedFeatures.map(f => f.id);
              const featureMatchScore = calculateFeatureMatchScore(apartmentFeatures, userFeatureIds);
              
              // Matched features
              const matchedFeatures = userWishedFeatures.filter(f => apartmentFeatures.includes(f.id));
              const missingFeatures = userWishedFeatures.filter(f => !apartmentFeatures.includes(f.id));
              
              return (
              <div 
                key={apt.id} 
                className={`border rounded p-3 flex gap-3 items-start transition-all duration-500 ${apt._justUpdated ? 'ring-2 ring-orange-400 bg-orange-50' : ''}`}
              >
                <div className="w-24 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0 relative">
                  {apt.image_urls && apt.image_urls[0] ? <img src={apt.image_urls[0]} alt={apt.title || 'apt'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">No Image</div>}
                  {apt._justUpdated && (
                    <div className="absolute inset-0 bg-orange-400 bg-opacity-20 flex items-center justify-center">
                      <span className="text-2xl animate-bounce">↑</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold">{apt.title || apt.address || 'Apartment'}</h5>
                    <div className="text-sm font-medium">{apt.price_huf ? `${apt.price_huf} HUF` : apt.price ? `${apt.price} HUF` : 'Price N/A'}</div>
                  </div>
                  <div className="text-xs text-gray-600">District: {apt.district || '—'} • Beds: {apt.bedrooms || '—'}</div>
                  
                  {/* Feature comparison - Your wishes vs apartment */}
                  {userWishedFeatures.length > 0 && (
                    <div className="mt-2 border-t pt-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">Feature Match: {featureMatchScore}%</div>
                      {matchedFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {matchedFeatures.slice(0, 6).map(f => (
                            <span key={f.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200" title={f.description}>
                              {f.icon} {f.name}
                            </span>
                          ))}
                          {matchedFeatures.length > 6 && (
                            <span className="text-xs text-gray-500">+{matchedFeatures.length - 6} more</span>
                          )}
                        </div>
                      )}
                      {missingFeatures.length > 0 && missingFeatures.length <= 3 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-gray-500">Missing:</span>
                          {missingFeatures.map(f => (
                            <span key={f.id} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-200" title={f.description}>
                              {f.icon} {f.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Multi-user Compatibility Scoring */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {/* User Score */}
                    {(() => {
                      const userScore = Math.round(apt.aiScore ?? apt.archetypeScore ?? apt.personalityScore ?? 50);
                      const colorClass = userScore >= 80 ? 'bg-green-100 text-green-800' : userScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800';
                      return (
                        <div className={`text-sm px-2 py-1 rounded ${colorClass}`}>
                          {userArchetype ? `${userArchetype.emoji} You` : 'Suits you'}: <strong>{userScore}</strong>%
                        </div>
                      );
                    })()}
                    
                    {/* Partner Score (if in partner mode) */}
                    {partnerMode && apt.partnerScore !== undefined && (() => {
                      const pScore = Math.round(apt.partnerScore);
                      const colorClass = pScore >= 80 ? 'bg-green-100 text-green-800' : pScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800';
                      return (
                        <div className={`text-sm px-2 py-1 rounded ${colorClass}`}>
                          {partnerArchetype ? `${partnerArchetype.emoji} Partner` : '💑 Partner'}: <strong>{pScore}</strong>%
                        </div>
                      );
                    })()}
                    
                    {/* Compatibility Score (if partner mode) */}
                    {partnerMode && apt.compatibilityScore !== undefined && (() => {
                      const compScore = Math.round(apt.compatibilityScore);
                      const colorClass = compScore >= 80 ? 'bg-pink-100 text-pink-800' : compScore >= 50 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
                      return (
                        <div className={`text-sm px-2 py-1 rounded ${colorClass} font-semibold`}>
                          💞 Together: <strong>{compScore}</strong>%
                        </div>
                      );
                    })()}
                    
                    <button onClick={async () => {
                      // Show personalized description using AI if available
                      try {
                        const desc = await generatePersonalizedDescription(apt, { query }, personality);
                        pushMessage('ai', desc);
                      } catch (err) {
                        pushMessage('ai', 'This apartment looks like a good match based on your story and preferences.');
                      }
                    }} className="text-xs px-2 py-1 bg-blue-50 text-blue-800 rounded">Why?</button>
                    <a href={`/apartments/${apt.id}`} className="ml-auto text-xs text-orange-600 underline">View</a>
                  </div>
                  {apt.aiReasons && apt.aiReasons.length > 0 && (
                    <ul className="mt-2 text-xs text-gray-700 list-disc ml-4">
                      {apt.aiReasons.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
                    </ul>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-bold text-blue-900 mb-2 flex items-center">Natural Language Search</h4>
        <p className="text-sm text-blue-800 mb-2">Type a story, get interactive follow-ups, and see ranked apartments update in real time.</p>
      </div>
    </div>
  );
}
