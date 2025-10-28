// Enhanced Duplicate Detection Service
// Detects duplicate apartments using multiple signals: address, geolocation, photos, descriptions, amenities, and owner information

import { createClient, createServiceClient } from '@/utils/supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

export interface DuplicateDetectionResult {
  apartmentId: string;
  matches: DuplicateMatch[];
  detectionMethod: 'full_scan' | 'incremental' | 'manual';
  totalMatches: number;
  highestMatchScore: number;
  completedAt: Date;
}

export interface DuplicateMatch {
  candidateId: string;
  totalScore: number;
  scoreBreakdown: {
    addressScore: number; // 0-1: address similarity
    titleScore: number; // 0-1: title similarity
    geoScore: number; // 0-1: geographic proximity
    photoScore: number; // 0-1: photo similarity via perceptual hashing
    descriptionScore: number; // 0-1: semantic similarity of descriptions
    amenityScore: number; // 0-1: amenity overlap
    ownerScore: number; // 0-1: same owner indicator
  };
  confidence: 'high' | 'medium' | 'low';
  evidenceItems: string[];
}

interface PhotoHash {
  imageKey: string;
  pHash: number;
  aHash?: number;
  dHash?: number;
}

interface ApartmentData {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  canonical_address: string | null;
  latitude: number | null;
  longitude: number | null;
  owner_id: string | null;
  image_keys: string[] | null;
  amenities: Record<string, boolean> | null;
  created_at: string;
}

class EnhancedDuplicateDetectionService {
  private genAI: GoogleGenerativeAI | null = null;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Detect duplicates for a specific apartment
   */
  async detectDuplicatesForApartment(
    apartmentId: string,
    method: 'full_scan' | 'incremental' = 'incremental'
  ): Promise<DuplicateDetectionResult> {
    const supabase = createClient();
    const startTime = new Date();

    try {
      // Get apartment details
      const { data: apartment } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', apartmentId)
        .single();

      if (!apartment) {
        throw new Error(`Apartment ${apartmentId} not found`);
      }

      // Get photo hashes for this apartment
      const { data: photoHashes } = await supabase
        .from('apartment_photo_hashes')
        .select('*')
        .eq('apartment_id', apartmentId);

      // Get candidate apartments to compare
      const candidates = await this.getCandidateApartments(apartment, method);

      // Score each candidate
      const matches: DuplicateMatch[] = [];
      for (const candidate of candidates) {
        const match = await this.scoreApartmentPair(
          apartment,
          candidate,
          photoHashes || []
        );
        if (match && match.totalScore >= 0.4) {
          // Only include matches with score >= 40%
          matches.push(match);
        }
      }

      // Sort by score descending
      matches.sort((a, b) => b.totalScore - a.totalScore);

      // Store detection run
      await supabase.from('duplicate_detection_runs').insert({
        apartment_id: apartmentId,
        total_matches: matches.length,
        highest_match_score: matches.length > 0 ? matches[0].totalScore : null,
        detection_method: method,
        completed_at: new Date().toISOString(),
      });

      return {
        apartmentId,
        matches,
        detectionMethod: method,
        totalMatches: matches.length,
        highestMatchScore: matches.length > 0 ? matches[0].totalScore : 0,
        completedAt: new Date(),
      };
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      throw error;
    }
  }

  /**
   * Get candidate apartments to compare against
   */
  private async getCandidateApartments(
    apartment: ApartmentData,
    method: 'full_scan' | 'incremental'
  ): Promise<ApartmentData[]> {
    const supabase = createClient();

    if (method === 'full_scan') {
      // Compare against all apartments except itself
      const { data } = await supabase
        .from('apartments')
        .select('id, title, description, address, canonical_address, latitude, longitude, owner_id, image_keys, amenities')
        .neq('id', apartment.id)
        .order('created_at', { ascending: false });

      // Ensure created_at exists (some queries may omit it); provide fallback to satisfy the ApartmentData type
      const normalized = (data || []).map((d: any) => ({
        ...d,
        created_at: d.created_at ?? new Date().toISOString(),
      }));

      return normalized;
    } else {
      // Incremental: use geographic proximity + recent activity
      // Get apartments near this one (within ~2 km)
      const { data } = await supabase
        .rpc('apartments_nearby', {
          lat: apartment.latitude,
          lng: apartment.longitude,
          distance_km: 2,
          exclude_id: apartment.id,
        });

      return data || [];
    }
  }

  /**
   * Score a pair of apartments for similarity
   */
  private async scoreApartmentPair(
    apt1: ApartmentData,
    apt2: ApartmentData,
    photoHashes1: PhotoHash[]
  ): Promise<DuplicateMatch | null> {
    try {
      const breakdown = {
        addressScore: this.scoreAddressSimilarity(apt1, apt2),
        titleScore: this.scoreTitleSimilarity(apt1, apt2),
        geoScore: this.scoreGeographicProximity(apt1, apt2),
        photoScore: 0, // Would be populated if we have photo hashes for apt2
        descriptionScore: await this.scoreDescriptionSimilarity(apt1, apt2),
        amenityScore: this.scoreAmenitySimilarity(apt1, apt2),
        ownerScore: this.scoreOwnerOverlap(apt1, apt2),
      };

      // Weighted average
      const weights = {
        addressScore: 0.35,
        titleScore: 0.15,
        geoScore: 0.25,
        photoScore: 0.10,
        descriptionScore: 0.05,
        amenityScore: 0.05,
        ownerScore: 0.05,
      };

      let totalScore = 0;
      for (const [key, weight] of Object.entries(weights)) {
        const scoreKey = key as keyof typeof breakdown;
        totalScore += (breakdown[scoreKey] || 0) * weight;
      }

      if (totalScore < 0.15) {
        return null; // Too low to be meaningful
      }

      // Generate evidence items
      const evidence: string[] = [];
      if (breakdown.addressScore > 0.7) {
        evidence.push(`Address similarity: ${(breakdown.addressScore * 100).toFixed(0)}%`);
      }
      if (breakdown.titleScore > 0.7) {
        evidence.push(`Title similarity: ${(breakdown.titleScore * 100).toFixed(0)}%`);
      }
      if (breakdown.geoScore > 0.8) {
        evidence.push('Close geographic proximity');
      }
      if (breakdown.photoScore > 0.7) {
        evidence.push(`Photo similarity: ${(breakdown.photoScore * 100).toFixed(0)}%`);
      }
      if (breakdown.descriptionScore > 0.7) {
        evidence.push(`Description similarity: ${(breakdown.descriptionScore * 100).toFixed(0)}%`);
      }
      if (breakdown.amenityScore > 0.6) {
        evidence.push(`Amenity overlap: ${(breakdown.amenityScore * 100).toFixed(0)}%`);
      }
      if (breakdown.ownerScore > 0.5) {
        evidence.push('Same owner');
      }

      const confidence: 'high' | 'medium' | 'low' =
        totalScore >= 0.75
          ? 'high'
          : totalScore >= 0.5
            ? 'medium'
            : 'low';

      return {
        candidateId: apt2.id,
        totalScore: Math.round(totalScore * 1000) / 1000, // Round to 3 decimals
        scoreBreakdown: breakdown,
        confidence,
        evidenceItems: evidence,
      };
    } catch (error) {
      console.error('Error scoring apartment pair:', error);
      return null;
    }
  }

  /**
   * Score address similarity (0-1)
   */
  private scoreAddressSimilarity(apt1: ApartmentData, apt2: ApartmentData): number {
    const addr1 = apt1.canonical_address || apt1.address || '';
    const addr2 = apt2.canonical_address || apt2.address || '';

    if (!addr1 || !addr2) return 0;

    // Exact match
    if (addr1.toLowerCase() === addr2.toLowerCase()) return 1.0;

    // Levenshtein-like similarity (simplified)
    const similarity = this.stringSimilarity(addr1, addr2);
    return Math.min(1, similarity);
  }

  /**
   * Score title similarity (0-1)
   */
  private scoreTitleSimilarity(apt1: ApartmentData, apt2: ApartmentData): number {
    const title1 = apt1.title || '';
    const title2 = apt2.title || '';

    if (!title1 || !title2) return 0;

    // Exact match
    if (title1.toLowerCase() === title2.toLowerCase()) return 1.0;

    // String similarity
    const similarity = this.stringSimilarity(title1, title2);
    return Math.min(1, similarity);
  }

  /**
   * Score geographic proximity (0-1)
   * Returns 1.0 for same location, decreases with distance
   */
  private scoreGeographicProximity(apt1: ApartmentData, apt2: ApartmentData): number {
    if (apt1.latitude === null || apt1.longitude === null ||
        apt2.latitude === null || apt2.longitude === null) {
      return 0;
    }

    const distance = this.haversineDistance(
      apt1.latitude,
      apt1.longitude,
      apt2.latitude,
      apt2.longitude
    );

    // Within 50 meters = 1.0 (very likely duplicate)
    if (distance < 0.05) return 1.0;
    // Within 200 meters = 0.8
    if (distance < 0.2) return 0.8;
    // Within 500 meters = 0.6
    if (distance < 0.5) return 0.6;
    // Within 1 km = 0.3
    if (distance < 1.0) return 0.3;
    // Within 2 km = 0.1
    if (distance < 2.0) return 0.1;

    return 0;
  }

  /**
   * Score description similarity using semantic embeddings (0-1)
   */
  private async scoreDescriptionSimilarity(apt1: ApartmentData, apt2: ApartmentData): Promise<number> {
    if (!apt1.description || !apt2.description || !this.genAI) {
      return 0;
    }

    try {
      const embedding1 = await this.getDescriptionEmbedding(apt1.description);
      const embedding2 = await this.getDescriptionEmbedding(apt2.description);

      if (!embedding1 || !embedding2) {
        return 0;
      }

      // Compute cosine similarity
      const similarity = this.cosineSimilarity(embedding1, embedding2);
      return Math.max(0, Math.min(1, similarity));
    } catch (error) {
      console.error('Error scoring description similarity:', error);
      return 0;
    }
  }

  /**
   * Score amenity overlap (0-1)
   */
  private scoreAmenitySimilarity(apt1: ApartmentData, apt2: ApartmentData): number {
    if (!apt1.amenities || !apt2.amenities) {
      return 0;
    }

    const amenities1 = Object.entries(apt1.amenities)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    const amenities2 = Object.entries(apt2.amenities)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (amenities1.length === 0 || amenities2.length === 0) {
      return 0;
    }

    const intersection = amenities1.filter(a => amenities2.includes(a)).length;
    const union = new Set([...amenities1, ...amenities2]).size;

    return intersection / union; // Jaccard similarity
  }

  /**
   * Score owner overlap (0-1)
   * Returns 1.0 if same owner, 0 otherwise
   */
  private scoreOwnerOverlap(apt1: ApartmentData, apt2: ApartmentData): number {
    if (!apt1.owner_id || !apt2.owner_id) {
      return 0;
    }

    return apt1.owner_id === apt2.owner_id ? 1.0 : 0;
  }

  /**
   * Get or compute embedding for apartment description
   */
  private async getDescriptionEmbedding(description: string): Promise<number[] | null> {
    if (!this.genAI) return null;

    const hash = this.simpleHash(description);
    if (this.embeddingCache.has(hash)) {
      return this.embeddingCache.get(hash) || null;
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      const result = await model.embedContent(description);
      const embedding = result.embedding.values;
      this.embeddingCache.set(hash, embedding);
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Generate perceptual hash for an image (pHash)
   * Simple version - in production would use a proper pHash library
   */
  async generatePhash(imageBuffer: Buffer): Promise<bigint> {
    try {
      // Resize to 8x8 for simple pHash
      const resized = await sharp(imageBuffer)
        .resize(8, 8, { fit: 'cover' })
        .grayscale()
        .raw()
        .toBuffer();

      // Convert to hash
      let hash = BigInt(0);
      for (let i = 0; i < resized.length; i++) {
        if (resized[i] > 128) {
          hash |= (BigInt(1) << BigInt(i % 64));
        }
      }

      return hash;
    } catch (error) {
      console.error('Error generating pHash:', error);
      return BigInt(0);
    }
  }

  /**
   * Compute Hamming distance between two hashes
   * Lower distance = more similar
   */
  private hammingDistance(hash1: bigint, hash2: bigint): number {
    let diff = hash1 ^ hash2;
    let distance = 0;

    while (diff > BigInt(0)) {
      if ((diff & BigInt(1)) !== BigInt(0)) distance++;
      diff >>= BigInt(1);
    }

    return distance;
  }

  /**
   * String similarity using Levenshtein distance
   */
  private stringSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];

    for (let k = 0; k <= s1.length; k++) costs[k] = k;

    for (let i = 1; i <= s2.length; i++) {
      costs[0] = i;
      let nw = i - 1;

      for (let j = 1; j <= s1.length; j++) {
        const cj = Math.min(
          1 + Math.min(costs[j], costs[j - 1]),
          nw + (s1[j - 1] === s2[i - 1] ? 0 : 1)
        );
        nw = costs[j];
        costs[j] = cj;
      }
    }

    return costs[s1.length];
  }

  /**
   * Haversine distance between two coordinates in kilometers
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length || vec1.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Simple hash function for caching
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}

export const enhancedDuplicateDetectionService = new EnhancedDuplicateDetectionService();
