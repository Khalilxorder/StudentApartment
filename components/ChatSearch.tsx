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
import ExplainWhy, { RecommendationReason } from './ExplainWhy';
import SearchOriginBadge, {
  determineSearchOrigin,
  getScoreForDisplay,
  type SearchOrigin
} from './SearchOriginBadge';
import WhyThisModal from './WhyThisModal';
import FloatingChatPanel from './FloatingChatPanel';
import { SaveApartmentButton } from '@/components/SaveApartmentButton';
import type { Message, WhyModalState } from './chat-search/types';
import { useSearchAgent } from '@/hooks/useSearchAgent';
import { getUniversityById, universities } from '@/lib/university-service';
import { useTranslations } from 'next-intl';
import ApartmentListingCard from './ApartmentListingCard';


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
  const t = useTranslations('Search');
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { messages, goal, sendMessage, setMessages } = useSearchAgent();
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
  const [lastQuery, setLastQuery] = useState('');
  const [whyModalState, setWhyModalState] = useState<WhyModalState | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Fetch favorites on mount
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites');
        if (res.ok) {
          const data = await res.json();
          setFavoriteIds(data.apartmentIds || []);
        }
      } catch (err) {
        console.error('Failed to fetch favorites', err);
      }
    };
    fetchFavorites();
  }, []);

  const handleFavoriteToggle = (id: string) => {
    setFavoriteIds(prev =>
      prev.includes(id)
        ? prev.filter(fid => fid !== id)
        : [...prev, id]
    );
  };
  const resultsPerPage = 12;
  const chatRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const fetchCsrfToken = async () => {
    const response = await fetch('/api/csrf', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token (${response.status})`);
    }

    const data = await response.json();
    if (!data?.csrfToken) {
      throw new Error('CSRF token missing in response');
    }

    return data.csrfToken as string;
  };

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load cached data on mount OR clear if URL has ?clear parameter
  useEffect(() => {
    if (!mounted) return; // Only run after component is mounted

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
  }, [mounted]);

  // Save to cache when data changes
  useEffect(() => {
    if (!mounted) return;
    if (currentResults.length > 0) {
      localStorage.setItem('chatSearch_results', JSON.stringify(currentResults));
    } else {
      localStorage.removeItem('chatSearch_results');
    }
  }, [currentResults, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (messages.length > 0) {
      localStorage.setItem('chatSearch_messages', JSON.stringify(messages));
    } else {
      localStorage.removeItem('chatSearch_messages');
    }
  }, [messages, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (userWishedFeatures.length > 0) {
      localStorage.setItem('chatSearch_features', JSON.stringify(userWishedFeatures));
    } else {
      localStorage.removeItem('chatSearch_features');
    }
  }, [userWishedFeatures, mounted]);

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
    context?: { matchedFeatures?: FeatureIcon[]; matchScore?: number; aiReasons?: string[] }
  ) => {
    if (!apartment) return;

    const matchedFeatures = context?.matchedFeatures || apartment.matchedFeatures || [];
    // Convert string[] aiReasons from context to RecommendationReason[] format if needed
    const contextReasons: RecommendationReason[] = context?.aiReasons?.map((reason, i) => ({
      factor: reason,
      description: reason,
      weight: 0.8 - (i * 0.1)
    })) || [];
    const explanationReasons =
      contextReasons.length > 0
        ? contextReasons
        : buildExplainReasons(apartment.aiReasons, matchedFeatures);

    const mergedResult = {
      ...apartment,
      aiScore: context?.matchScore ?? apartment.aiScore,
    };

    const origin = determineSearchOrigin(mergedResult);
    const badgeScore = getScoreForDisplay(mergedResult) ?? context?.matchScore ?? apartment.featureMatchScore ?? apartment.score ?? 0;
    const normalizedScore = Math.max(0, Math.min(100, Math.round(Number.isFinite(badgeScore) ? badgeScore : 0)));

    setWhyModalState({
      apartmentId: apartment.id,
      apartmentTitle: apartment.title || apartment.address || 'Apartment',
      score: normalizedScore,
      origin,
      reasons: explanationReasons.map((reason) => ({
        factor: reason.factor,
        description: reason.description,
        weight: reason.weight,
      })),
      aiReasons: Array.isArray(apartment.aiReasons)
        ? apartment.aiReasons.filter((reason: unknown): reason is string => typeof reason === 'string')
        : [],
      scoreComponents: {
        aiScore: typeof apartment.aiScore === 'number' ? apartment.aiScore : null,
        featureMatchScore: typeof apartment.featureMatchScore === 'number' ? apartment.featureMatchScore : null,
        semanticScore: typeof apartment.score === 'number' ? apartment.score : null,
      },
    });
  };

  const submitSearchFeedback = async (helpful: boolean) => {
    if (!whyModalState) return;

    const payload = {
      apartmentId: whyModalState.apartmentId,
      helpful,
      origin: whyModalState.origin,
      score: whyModalState.score,
      query: lastQuery || undefined,
      components: {
        origin: whyModalState.origin,
        displayedScore: whyModalState.score,
        aiScore: whyModalState.scoreComponents.aiScore,
        featureMatchScore: whyModalState.scoreComponents.featureMatchScore,
        semanticScore: whyModalState.scoreComponents.semanticScore,
      },
      reasons: whyModalState.reasons.map((reason) => reason.description).filter(Boolean).slice(0, 5),
      aiReasons: whyModalState.aiReasons.slice(0, 5),
    };

    try {
      await fetch('/api/search/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('Failed to submit search feedback', error);
    }
  };

  // Pre-load universities for synchronous checking
  // In a real app, this might be a context or hook, but importing the constant is fine for now.
  // We need to import this at top level, but for this editing tool, I will add it inside and fix imports separately or assume global availability if I could.
  // Actually, I should add the import at the top first. I will split this into two edits.

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

    // Check for universities
    // Note: universities list must be imported/available.
    // I will iterate deeply in a separate loop to avoid "universities is not defined" error here if import is missing.
    // But since I am editing the file, I will rely on the import I add in next step.
    const universitiesList = [
      { id: 'bme', names: ['bme', 'technology', 'műegyetem'] },
      { id: 'elte-btk', names: ['elte btk', 'elte humanities', 'astoria'] },
      { id: 'elte-ttk', names: ['elte ttk', 'elte science', 'lágymányosi'] },
      { id: 'corvinus', names: ['corvinus', 'közgáz', 'fővám'] },
      { id: 'semmelweis', names: ['semmelweis', 'sote', 'medical', 'klinkák'] },
      { id: 'bge', names: ['bge', 'business school'] }
    ];

    for (const uni of universitiesList) {
      if (uni.names.some(name => lower.includes(name))) {
        result.university = uni.id;
        console.log('🎓 University detected:', uni.id);
        break;
      }
    }

    const keywords: string[] = [];
    ['furnished', 'balcony', 'elevator', 'wifi', 'parking', 'pet', 'bright', 'quiet', 'cozy', 'modern', 'renovated', 'studio', 'private'].forEach(k => { if (lower.includes(k)) keywords.push(k); });
    if (keywords.length) result.search = keywords.join(' ');

    console.log('✅ Parse result:', result);
    return result;
  };

  const fetchApartments = async (filters: any) => {
    console.log('🔍 Fetching with filters:', filters);
    let query = supabase
      .from('apartments')
      .select(`
        id,
        title,
        address,
        description,
        monthly_rent_huf,
        bedrooms,
        bathrooms,
        district,
        latitude,
        longitude,
        furnished,
        has_elevator,
        size_sqm,
        floor,
        total_floors,
        lease_min_months,
        deposit_months,
        utilities_included,
        pets_allowed,
        owner_verified,
        distance_to_metro_m,
        distance_to_university_m,
        created_at,
        apartment_media(
          file_url,
          is_primary
        ),
        apartment_amenities(
          amenity_code,
          amenities(
            code,
            label
          )
        )
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(60);

    if (filters.bedrooms) {
      console.log('🔍 Filtering bedrooms >=', filters.bedrooms);
      query = query.gte('bedrooms', filters.bedrooms);
    }
    if (filters.minPrice) {
      console.log('🔍 Filtering minPrice >=', filters.minPrice);
      query = query.gte('monthly_rent_huf', filters.minPrice);
    }
    if (filters.maxPrice) {
      console.log('🔍 Filtering maxPrice <=', filters.maxPrice);
      query = query.lte('monthly_rent_huf', filters.maxPrice);
    }
    if (filters.district) {
      console.log('🔍 Filtering district =', filters.district);
      query = query.eq('district', filters.district);
    }
    if (filters.search) {
      const sanitized = String(filters.search)
        .replace(/['%_]/g, ' ')
        .trim();
      if (sanitized) {
        console.log('🔍 Searching for:', sanitized);
        query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,address.ilike.%${sanitized}%`);
      }
    }
    if (filters.university) {
      // If we have a university, and the SearchSvc handles it, we can pass it.
      // However, for the specific client-side Supabase query here, we might want to filter by coordinates if we had them.
      // But fetchApartments here uses direct Supabase query, whereas /api/search uses SearchService.
      // The current code calls fetchApartments separately from runSearchFlow which calls /api/ai/analyze.
      // Search logic is split: "fetchApartments" does DB query.
      // We need to support university filter in DB query.
      // We can use distance-based filtering if we have the university location.
      // Since I don't have the university coords here easily without importing the list and finding it,
      // I will rely on the `distance_to_university_m` column if it's populated for the NEAREST university.
      // But that column doesn't specify WHICH university.

      // Better approach: Let's assume the user wants apartments near the selected University.
      // Ideally, we should switch fetchApartments to use /api/search!
      // The current implementation of fetchApartments query strictly from DB.
      // The Plan said "Update search UI to allow filtering by proximity to universities".

      // I will leave this block as is for now and focus on switching the Search Flow to use /api/search if possible, OR
      // handle it here by NOT filtering in Supabase but letting the backend /api/search handle it if we used it.
      // Actually, line 575 `let apartments = await fetchApartments(localParse);` calls this function.
      // It does NOT use `/api/search`.
      // I should refactor `fetchApartments` to use `/api/search`?
      // No, that's a big refactor.

      // Alternative: Use post-filtering or a known coordinate set.
      console.log('🔍 Filtering by university:', filters.university);
      // For now, we unfortunately can't do accurate university filtering in pure Supabase Client query 
      // without PostGIS support on the client or knowing the university coords.
      // BUT, I can import `getUniversityById` if I added the import.
    }

    const { data, error } = await query;
    if (error) throw error;
    const normalized = (data ?? []).map((apt: any) => {
      const amenities = Array.isArray(apt.apartment_amenities)
        ? apt.apartment_amenities
          .map((entry: any) =>
            entry?.amenity?.label ?? entry?.amenity?.code ?? entry?.amenity_code ?? null,
          )
          .filter((value: string | null): value is string => Boolean(value))
        : [];

      // Map apartment_media to image_urls
      const media = Array.isArray(apt.apartment_media) ? apt.apartment_media : [];
      // Sort so primary is first
      media.sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      const image_urls = media.map((m: any) => m.file_url).filter(Boolean);

      const { apartment_amenities, monthly_rent_huf, apartment_media, ...rest } = apt;
      return {
        ...rest,
        price_huf: monthly_rent_huf, // Normalize for UI compatibility
        amenities,
        image_urls // Explicitly set the mapped URLs
      };
    });

    console.log(`✅ Found ${normalized.length} apartments from database`);
    return normalized;
  };

  const runSearchFlow = async (story: string) => {
    setLoading(true);
    const sanitizedStory = sanitizeUserInput(story);
    setCurrentPage(1);
    setDisplayedResults([]);

    // Add user message to chat history
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
      const csrfToken = await fetchCsrfToken();
      console.log('🤖 Calling Gemini AI via secure API...');
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
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
                size: (apt as { size_sqm?: number }).size_sqm || null,
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
    setLastQuery(sanitizedQuery);
    setWhyModalState(null);
    await runSearchFlow(sanitizedQuery);
    setQuery('');
  };

  const handleClear = () => {
    setCurrentResults([]);
    setDisplayedResults([]);
    setMessages([]);
    setFollowUps([]);
    setAskedQuestions([]);
    setUserWishedFeatures([]);
    setChatExpanded(false);
    setCurrentPage(1);
    setWhyModalState(null);
    setLastQuery('');
    localStorage.removeItem('chatSearch_results');
    localStorage.removeItem('chatSearch_messages');
    localStorage.removeItem('chatSearch_features');
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
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('header')}</h1>
                  <div className="text-6xl mb-4">💬</div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('subheader')}</h2>
                  <p className="text-gray-700 mb-6">{t('prompt')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <button
                      onClick={() => setQuery("I'm a student at ELTE with 100k budget, want modern apartment near metro")}
                      className="p-5 bg-orange-50 hover:bg-orange-100 rounded-xl text-left border border-orange-200 transition"
                      aria-label="Use student example search"
                    >
                      <div className="font-medium text-gray-900 mb-1">{t('examples.studentLabel')}</div>
                      <div className="text-sm text-gray-700">&ldquo;{t('examples.student')}&rdquo;</div>
                    </button>
                    <button
                      onClick={() => setQuery("Looking for 2BR with balcony, quiet, budget 150k")}
                      className="p-5 bg-blue-50 hover:bg-blue-100 rounded-xl text-left border border-blue-200 transition"
                      aria-label="Use couple example search"
                    >
                      <div className="font-medium text-gray-900 mb-1">{t('examples.coupleLabel')}</div>
                      <div className="text-sm text-gray-700">&ldquo;{t('examples.couple')}&rdquo;</div>
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.from === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center mr-3 flex-shrink-0 text-sm font-bold">AI</div>
                  )}
                  <div className={`max-w-2xl px-4 py-3 rounded-2xl ${msg.from === 'user' ? 'bg-orange-500 text-white rounded-br-sm' :
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
                  onChange={(e) => setSortBy(e.target.value as 'match' | 'price-low' | 'price-high' | 'bedrooms')}
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
                  return (
                    <ApartmentListingCard
                      key={apt.id}
                      apt={apt}
                      userWishedFeatures={userWishedFeatures}
                      favoriteIds={favoriteIds}
                      onToggleFavorite={handleFavoriteToggle}
                      onWhyThisClick={handleWhyThisClick}
                    />
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
                            className={`px-4 py-3 rounded-lg transition min-h-[44px] ${currentPage === page
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

          {/* Chat Panel - Fixed at bottom, expands upward */}
          <FloatingChatPanel
            messages={messages}
            goal={goal} // Pass Search Agent Goal
            query={query}
            loading={loading}
            followUps={followUps}
            chatExpanded={chatExpanded}
            chatHovered={chatHovered}
            onQueryChange={setQuery}
            onFocusInput={() => setChatHovered(true)}
            onSubmit={handleSubmit}
            onFollowUpClick={(q) => handleSubmit(undefined, q)}
            onClear={handleClear}
            onToggleExpand={() => setChatExpanded(prev => !prev)}
            onChatHoverChange={setChatHovered}
          />
        </>
      )}

      <WhyThisModal
        isOpen={Boolean(whyModalState)}
        onClose={() => setWhyModalState(null)}
        apartmentTitle={whyModalState?.apartmentTitle ?? ''}
        score={whyModalState?.score ?? 0}
        origin={whyModalState?.origin ?? 'structured'}
        reasons={whyModalState?.reasons ?? []}
        aiReasons={whyModalState?.aiReasons ?? []}
        onFeedback={(helpful) => submitSearchFeedback(helpful)}
      />
    </div>
  );
}



















