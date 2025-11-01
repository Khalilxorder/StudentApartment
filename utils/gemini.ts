// Using REST API directly to avoid SDK compatibility issues
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Import circuit breaker for Gemini resilience
import { getGeminiCircuitBreaker } from '../lib/circuit-breaker';

// Get API key lazily to ensure env vars are loaded
function getApiKey(): string {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    console.error('❌ GOOGLE_AI_API_KEY environment variable is not set!');
    console.log('📍 Current env vars:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
  }
  return key || '';
}

// Simple in-memory cache for AI scoring results
const scoringCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// Request deduplication to prevent duplicate parallel requests
const pendingRequests = new Map<string, Promise<any>>();

// Timeout configurations
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const EMBEDDING_TIMEOUT_MS = 15000; // 15 seconds for embeddings

/**
 * Execute with timeout and circuit breaker protection
 */
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const breaker = getGeminiCircuitBreaker();
  
  return breaker.execute(async () => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`[AI_TIMEOUT] Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  });
}

// Generate a simple hash for user profile to create cache keys
function hashUserProfile(userProfile: any): string {
  const key = JSON.stringify({
    budget: userProfile.budget,
    location: userProfile.location,
    preferences: userProfile.preferences?.sort(),
    priorities: userProfile.priorities?.sort()
  });
  return Buffer.from(key).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}

// Models available - FIXED: Using gemini-2.5-flash-lite-preview
// Note: This is the current working model for the project
export const MODELS = {
  TEXT: 'gemini-2.5-flash-lite-preview', // Current working model
  FLASH: 'gemini-2.5-flash-lite-preview', // Current working model
  FLASH_PREVIEW: 'gemini-2.5-flash-lite-preview', // Current working model
  PRO: 'gemini-2.5-flash-lite-preview' // Current working model
} as const;

// Generate response from text prompt using REST API with parallel failover + circuit breaker
export async function generateTextResponse(prompt: string, context?: string): Promise<string> {
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  
  // Create request hash for deduplication
  const requestHash = Buffer.from(fullPrompt).toString('base64').substring(0, 32);
  
  // Check if this exact request is already in progress
  if (pendingRequests.has(requestHash)) {
    console.log('🔄 Reusing pending request for duplicate prompt');
    return pendingRequests.get(requestHash)!;
  }
  
  // FIXED: Use gemini-2.5-flash-lite-preview model
  const modelsToTry = [
    'gemini-2.5-flash-lite-preview',    // Current working model
  ];

  const makeRequest = async (): Promise<string> => {
    // Try all models in parallel for fastest response (race condition)
    const parallelAttempts = modelsToTry.slice(0, 2).map(async (modelName) => {
      try {
        const url = `${API_URL}/${modelName}:generateContent?key=${getApiKey()}`;
        
        console.log(`🤖 Server: Analyzing story with ${modelName}...`);
        const response = await executeWithTimeout(
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: fullPrompt }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
              }
            })
          }),
          DEFAULT_TIMEOUT_MS
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${modelName}: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          console.log(`✅ Success with model: ${modelName}`);
          return text;
        }
        
        throw new Error(`No text in response from ${modelName}`);
      } catch (error) {
        console.log(`⚠️ Model ${modelName} failed:`, error);
        throw error;
      }
    });

    // Race the parallel attempts - whoever responds first wins
    try {
      return await Promise.race(parallelAttempts);
    } catch (raceError) {
      console.log('⚠️ Parallel attempts failed, trying sequential fallback...');
      
      // Sequential fallback with remaining models
      for (const modelName of modelsToTry.slice(2)) {
        try {
          const url = `${API_URL}/${modelName}:generateContent?key=${getApiKey()}`;
          
          const response = await executeWithTimeout(
            fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 8192,
                }
              })
            }),
            DEFAULT_TIMEOUT_MS
          );

          if (!response.ok) {
            const errorText = await response.text();
            if (response.status >= 500) {
              console.log(`⚠️ Model ${modelName} server error (${response.status}), continuing...`);
              continue;
            } else {
              console.log(`❌ Model ${modelName} non-retriable error (${response.status})`);
              continue;
            }
          }

          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (text) {
            console.log(`✅ Success with fallback model: ${modelName}`);
            return text;
          }
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          if (errorMsg.includes('[AI_TIMEOUT]') || errorMsg.includes('Circuit')) {
            console.error(`❌ Timeout or circuit breaker triggered for ${modelName}`);
            throw error; // Re-throw timeouts to avoid silent failures
          }
          console.log(`⚠️ Error with ${modelName}:`, error);
          continue;
        }
      }
      
      throw new Error('Failed to generate AI response with any model');
    }
  };

  // Store pending request and clean up when done
  const requestPromise = makeRequest().finally(() => {
    pendingRequests.delete(requestHash);
  });
  
  pendingRequests.set(requestHash, requestPromise);
  return requestPromise;
}

// Analyze user story and extract preferences
export async function analyzeUserStory(story: string): Promise<{
  budget?: number;
  location?: string;
  roommates?: string;
  preferences: string[];
  priorities: string[];
  concerns: string[];
}> {
  const prompt = `
Analyze this apartment search story and extract key information:

"${story}"

Return a JSON object with:
- budget: monthly budget in HUF (if mentioned)
- location: preferred location/district
- roommates: living situation (alone, with partner, with friends, etc.)
- preferences: array of positive preferences (beautiful, modern, quiet, etc.)
- priorities: array of what matters most (budget, location, privacy, etc.)
- concerns: array of concerns (noise, dirt, distance, etc.)

Be specific and extract exact values where possible. Return ONLY valid JSON, no markdown.
  `;

  const response = await generateTextResponse(prompt);
  
  try {
    // Remove markdown code blocks if present
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    // Fallback parsing if JSON is malformed
    return {
      preferences: [],
      priorities: [],
      concerns: []
    };
  }
}

// Generate follow-up questions
export async function generateFollowUpQuestions(
  story: string,
  analysis: any,
  askedQuestions: string[] = []
): Promise<string[]> {
  const prompt = `
Based on this apartment search story, generate 3-5 essential follow-up questions:

Story: "${story}"

Current Analysis:
${JSON.stringify(analysis, null, 2)}

Already Asked Questions:
${askedQuestions.join('\n')}

Focus on: budget, living situation, location, lifestyle, must-have features.
Keep them conversational and specific. Return ONLY the questions, one per line.
  `;

  const response = await generateTextResponse(prompt);
  return response.split('\n').filter(q => q.trim().endsWith('?')).slice(0, 5);
}

// Calculate apartment suitability score
export async function calculateSuitabilityScore(
  apartment: any,
  userProfile: any,
  personalityData?: any
): Promise<{
  score: number;
  reasons: Array<{ factor: string; description: string; impact: number }>;
  compromises: string[];
}> {
  // Check cache first
  const userHash = hashUserProfile(userProfile);
  const cacheKey = `${userHash}-${apartment.id}`;
  const cached = scoringCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`📋 Using cached score for apartment ${apartment.id}`);
    return cached.result;
  }

  const prompt = `
Rate this apartment for the user on a scale of 1-100:

Apartment:
- Title: ${apartment.title}
- Price: ${apartment.price_huf || apartment.price} HUF/month
- Location: ${apartment.address || apartment.location || `District ${apartment.district}`}
- Bedrooms: ${apartment.bedrooms}
- Features: ${JSON.stringify(apartment.features || apartment.amenities || [])}

User Profile:
- Budget: ${userProfile.budget} HUF
- Location: ${userProfile.location}
- Preferences: ${JSON.stringify(userProfile.preferences)}
- Priorities: ${JSON.stringify(userProfile.priorities)}

Return JSON with:
{
  "score": number (1-100),
  "reasons": [{"factor": "string", "description": "string", "impact": number}],
  "compromises": ["string"]
}

Be specific about why this apartment matches or doesn't match. Return ONLY valid JSON.
  `;

  const response = await generateTextResponse(prompt);
  
  try {
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanResponse);
    
    // Cache the result
    scoringCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('Failed to parse scoring response:', error);
    return {
      score: 50,
      reasons: [],
      compromises: []
    };
  }
}

// Batch calculate suitability scores for multiple apartments
export async function batchCalculateSuitabilityScores(
  apartments: any[],
  userProfile: any,
  personalityData?: any,
  concurrencyLimit: number = 5
): Promise<Map<string, { score: number; reasons: string[]; compromises: string[] }>> {
  const results = new Map();
  const userHash = hashUserProfile(userProfile);

  // Separate cached vs uncached apartments
  const uncachedApartments: any[] = [];
  const cachedResults = new Map();

  for (const apt of apartments) {
    const cacheKey = `${userHash}-${apt.id}`;
    const cached = scoringCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      cachedResults.set(apt.id, cached.result);
      console.log(`📋 Using cached score for apartment ${apt.id}`);
    } else {
      uncachedApartments.push(apt);
    }
  }

  // Process uncached apartments in parallel batches
  const batches: any[][] = [];
  for (let i = 0; i < uncachedApartments.length; i += concurrencyLimit) {
    batches.push(uncachedApartments.slice(i, i + concurrencyLimit));
  }

  console.log(`🚀 Processing ${uncachedApartments.length} apartments in ${batches.length} parallel batches`);

  for (const batch of batches) {
    const batchPromises = batch.map(async (apartment) => {
      try {
        const result = await calculateSuitabilityScore(apartment, userProfile, personalityData);
        return { id: apartment.id, result };
      } catch (error) {
        console.error(`❌ Error scoring apartment ${apartment.id}:`, error);
        return {
          id: apartment.id,
          result: { score: 50, reasons: ['Error in analysis'], compromises: [] }
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ id, result }) => results.set(id, result));
  }

  // Merge cached and new results
  cachedResults.forEach((result, id) => results.set(id, result));

  return results;
}

// Generate personalized description for an apartment
export async function generatePersonalizedDescription(
  apartment: any,
  userProfile: any,
  personalityData?: any
): Promise<string> {
  const prompt = `
Create a personalized, friendly description of this apartment for the user:

APARTMENT:
${JSON.stringify(apartment, null, 2)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

PERSONALITY DATA:
${JSON.stringify(personalityData || {}, null, 2)}

Write a 2-3 sentence description that highlights why this apartment might be perfect for them, using their story and preferences. Make it conversational and exciting.
  `;

  return await generateTextResponse(prompt);
}
