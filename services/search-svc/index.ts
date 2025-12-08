import { runQuery } from '@/lib/db/pool';
// Dynamic import for embeddings to avoid build issues
let embeddingService: any = null;

async function getEmbeddingService() {
  if (!embeddingService) {
    try {
      const module = await import('@/lib/embeddings');
      embeddingService = module.embeddingService;
    } catch (error) {
      console.warn('Embeddings service not available:', error);
      embeddingService = null;
    }
  }
  return embeddingService;
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'distance' | 'newest';

export interface SearchFilters {
  query?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  budget?: {
    min: number;
    max: number;
  };
  rooms?: number;
  amenities?: string[];
  furnished?: boolean;
  university?: string;
  maxCommute?: number;
  district?: string;
  sortBy?: SortOption;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  apartment: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    rooms: number;
    location: { lat: number; lng: number };
    address: string | null;
    district: string;
    amenities: string[];
    photos: string[];
    owner: {
      name: string;
      verified: boolean;
    };
    metrics: {
      mediaQuality: number | null;
      completeness: number | null;
      commuteMinutes: number | null;
      suggestedPrice: number | null;
    };
  };
  score: number;
  distance?: number | null;
  reasons: string[];
  reasonCodes: string[];
  source: 'structured' | 'keyword' | 'semantic' | 'hybrid';
}

const DEFAULT_LIMIT = 20;
const MAX_PHOTO_RESULTS = 8;
const DEFAULT_LOCATION = { lat: 47.4979, lng: 19.0402 }; // Budapest centre

export class SearchServiceImpl {
  private meiliEnabled: boolean;

  constructor() {
    this.meiliEnabled = Boolean(process.env.MEILISEARCH_HOST);
  }

  async structuredSearch(filters: SearchFilters): Promise<SearchResult[]> {
    const sqlParts: string[] = [];
    const params: any[] = [];

    const location = filters.location ?? DEFAULT_LOCATION;
    params.push(location.lng, location.lat);

    sqlParts.push(`
      SELECT
        a.id,
        a.title,
        a.description,
        a.monthly_rent_huf AS price,
        a.room_count AS rooms,
        a.latitude,
        a.longitude,
        a.address,
        a.district,
        array_agg(amen.name ORDER BY amen.name) AS amenities,
        array_agg(COALESCE(am.variants->>'large', am.variants->>'medium', am.file_path)) AS photo_urls,
        po.full_name AS owner_name,
        (po.verification_status = 'verified') AS owner_verified,
        ST_Distance(
          a.geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance_meters,
        a.commute_cache,
        (SELECT ps.suggested_price
         FROM public.pricing_snapshots ps
         WHERE ps.apartment_id = a.id
         ORDER BY ps.created_at DESC
         LIMIT 1) AS suggested_price,
        a.media_quality_score,
        a.completeness_score
      FROM public.apartments a
      LEFT JOIN public.apartment_amenities aa ON aa.apartment_id = a.id
      LEFT JOIN public.amenities amen ON amen.id = aa.amenity_id
      LEFT JOIN public.apartment_media am ON am.apartment_id = a.id
      LEFT JOIN public.profiles_owner po ON po.id = a.owner_id
      WHERE a.status = 'published'
    `);

    if (filters.budget) {
      params.push(filters.budget.min, filters.budget.max);
      sqlParts.push(`AND a.monthly_rent_huf BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    if (filters.rooms) {
      params.push(filters.rooms);
      sqlParts.push(`AND a.room_count >= $${params.length}`);
    }

    if (filters.furnished !== undefined) {
      params.push(filters.furnished);
      sqlParts.push(`AND a.furnished = $${params.length}`);
    }

    if (filters.district) {
      params.push(`%${filters.district}%`);
      sqlParts.push(`AND a.district ILIKE $${params.length}`);
    }

    if (filters.location?.radius) {
      params.push(filters.location.radius);
      sqlParts.push(`AND ST_DWithin(a.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $${params.length})`);
    }

    if (filters.amenities?.length) {
      params.push(filters.amenities);
      sqlParts.push(`
        AND EXISTS (
          SELECT 1
          FROM public.apartment_amenities aa_req
          JOIN public.amenities amen_req ON amen_req.id = aa_req.amenity_id
          WHERE aa_req.apartment_id = a.id
            AND amen_req.name = ANY($${params.length})
        )
      `);
    }

    if (filters.university || typeof filters.maxCommute === 'number') {
      const universityIdx = params.push(filters.university ?? null);
      const commuteIdx = params.push(
        typeof filters.maxCommute === 'number' ? filters.maxCommute : null,
      );

      sqlParts.push(`
        AND (
          a.commute_cache IS NULL
          OR EXISTS (
            SELECT 1
            FROM jsonb_each(a.commute_cache) AS uni
            WHERE ($${universityIdx}::text IS NULL OR uni.key = $${universityIdx})
              AND (
                $${commuteIdx}::numeric IS NULL
                OR EXISTS (
                  SELECT 1
                  FROM jsonb_each(uni.value) AS mode
                  WHERE COALESCE((mode.value->>'minutes')::numeric, (mode.value->>'travelMinutes')::numeric) <= $${commuteIdx}
                )
              )
          )
        )
      `);
    }

    sqlParts.push(`
      GROUP BY a.id, po.full_name, po.verification_status, a.media_quality_score, a.completeness_score, a.commute_cache
      ORDER BY ${this.buildSortClause(filters.sortBy, Boolean(filters.location))}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `);

    params.push(filters.limit ?? DEFAULT_LIMIT, filters.offset ?? 0);

    const { rows } = await runQuery(sqlParts.join('\n'), params);
    const results = rows.map((row: any, index: number) =>
      this.mapRowToResult(row, 'structured', 0.9 - index * 0.01, filters)
    );

    if (typeof filters.maxCommute === 'number') {
      return results.filter((result: SearchResult) => {
        const minutes = result.apartment.metrics.commuteMinutes;
        return minutes === null || minutes <= filters.maxCommute!;
      });
    }

    return results;
  }

  async getStructuredCount(filters: SearchFilters): Promise<number> {
    const params: any[] = [];
    const conditions: string[] = ["a.status = 'published'"];
    const joins: string[] = [];

    if (filters.budget) {
      params.push(filters.budget.min, filters.budget.max);
      conditions.push(`a.monthly_rent_huf BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    if (filters.rooms) {
      params.push(filters.rooms);
      conditions.push(`a.room_count >= $${params.length}`);
    }

    if (filters.furnished !== undefined) {
      params.push(filters.furnished);
      conditions.push(`a.furnished = $${params.length}`);
    }

    if (filters.district) {
      params.push(`%${filters.district}%`);
      conditions.push(`a.district ILIKE $${params.length}`);
    }

    if (filters.location?.radius) {
      params.push(filters.location.lng, filters.location.lat, filters.location.radius);
      const lngIdx = params.length - 2;
      const latIdx = params.length - 1;
      const radiusIdx = params.length;
      conditions.push(
        `ST_DWithin(a.geom::geography, ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)::geography, $${radiusIdx})`
      );
    }

    if (filters.amenities?.length) {
      params.push(filters.amenities);
      joins.push('JOIN public.apartment_amenities aa ON aa.apartment_id = a.id');
      joins.push('JOIN public.amenities amen ON amen.id = aa.amenity_id');
      conditions.push(`amen.name = ANY($${params.length})`);
    }

    if (filters.university || typeof filters.maxCommute === 'number') {
      const universityIdx = params.push(filters.university ?? null);
      const commuteIdx = params.push(
        typeof filters.maxCommute === 'number' ? filters.maxCommute : null,
      );
      conditions.push(`
        (
          a.commute_cache IS NULL
          OR EXISTS (
            SELECT 1
            FROM jsonb_each(a.commute_cache) AS uni
            WHERE ($${universityIdx}::text IS NULL OR uni.key = $${universityIdx})
              AND (
                $${commuteIdx}::numeric IS NULL
                OR EXISTS (
                  SELECT 1
                  FROM jsonb_each(uni.value) AS mode
                  WHERE COALESCE((mode.value->>'minutes')::numeric, (mode.value->>'travelMinutes')::numeric) <= $${commuteIdx}
                )
              )
          )
        )
      `);
    }

    const sql = `
      SELECT COUNT(DISTINCT a.id) AS total
      FROM public.apartments a
      ${joins.join('\n')}
      WHERE ${conditions.join('\n        AND ')}
    `;

    const { rows } = await runQuery(sql, params);
    return Number(rows[0]?.total ?? 0);
  }

  async keywordSearch(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    if (this.meiliEnabled) {
      try {
        const { MeiliSearch } = await import('meilisearch');
        const client = new MeiliSearch({
          host: process.env.MEILISEARCH_HOST!,
          apiKey: process.env.MEILISEARCH_API_KEY,
        });
        const index = client.index('apartments');
        const response = await index.search(query, {
          filter: this.buildMeiliFilters(filters),
          limit: filters.limit ?? DEFAULT_LIMIT,
          offset: filters.offset ?? 0,
        });
        return response.hits.map((hit: any, idx: number) =>
          this.mapHitToResult(hit, 'keyword', hit._rankingScore ?? 0.8 - idx * 0.01)
        );
      } catch (error) {
        console.warn('Meilisearch unavailable, falling back to Postgres full-text search', error);
      }
    }

    const { rows } = await runQuery(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.monthly_rent_huf AS price,
        a.room_count AS rooms,
        a.latitude,
        a.longitude,
        a.address,
        a.district,
        array_agg(amen.name ORDER BY amen.name) AS amenities,
        array_agg(COALESCE(am.variants->>'large', am.variants->>'medium', am.file_path)) AS photo_urls,
        po.full_name AS owner_name,
        (po.verification_status = 'verified') AS owner_verified,
        a.media_quality_score,
        a.completeness_score,
        a.commute_cache
      FROM public.apartments a
      LEFT JOIN public.apartment_amenities aa ON aa.apartment_id = a.id
      LEFT JOIN public.amenities amen ON amen.id = aa.amenity_id
      LEFT JOIN public.apartment_media am ON am.apartment_id = a.id
      LEFT JOIN public.profiles_owner po ON po.id = a.owner_id
      WHERE a.status = 'published'
        AND to_tsvector('simple', COALESCE(a.title,'') || ' ' || COALESCE(a.description,'')) @@ plainto_tsquery($1)
      GROUP BY a.id, po.full_name, po.verification_status, a.media_quality_score, a.completeness_score, a.commute_cache
      ORDER BY ts_rank(
        to_tsvector('simple', COALESCE(a.title,'') || ' ' || COALESCE(a.description,'')),
        plainto_tsquery($1)
      ) DESC
      LIMIT $2 OFFSET $3
    `,
      [query, filters.limit ?? DEFAULT_LIMIT, filters.offset ?? 0],
    );

    return rows.map((row: any, idx: number) =>
      this.mapRowToResult(row, 'keyword', 0.75 - idx * 0.01, filters)
    );
  }

  async semanticSearch(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    const embeddingSvc = await getEmbeddingService();
    if (!embeddingSvc) {
      // Fallback to keyword search if embeddings unavailable
      console.warn('Embeddings unavailable, falling back to keyword search');
      return this.keywordSearch(query, filters);
    }

    const vector = await embeddingSvc.embedText(query);
    const embedding = embeddingSvc.toSqlVector(vector);
    const limit = filters.limit ?? DEFAULT_LIMIT;

    const { rows } = await runQuery(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.monthly_rent_huf AS price,
        a.room_count AS rooms,
        a.latitude,
        a.longitude,
        a.address,
        a.district,
        array_agg(amen.name ORDER BY amen.name) AS amenities,
        array_agg(COALESCE(am.variants->>'large', am.variants->>'medium', am.file_path)) AS photo_urls,
        po.full_name AS owner_name,
        (po.verification_status = 'verified') AS owner_verified,
        a.media_quality_score,
        a.completeness_score,
        a.commute_cache,
        ae.description_embedding <=> $1::vector AS similarity
      FROM public.apartment_embeddings ae
      JOIN public.apartments a ON a.id = ae.apartment_id
      LEFT JOIN public.apartment_amenities aa ON aa.apartment_id = a.id
      LEFT JOIN public.amenities amen ON amen.id = aa.amenity_id
      LEFT JOIN public.apartment_media am ON am.apartment_id = a.id
      LEFT JOIN public.profiles_owner po ON po.id = a.owner_id
      WHERE a.status = 'published'
      GROUP BY a.id, po.full_name, po.verification_status, a.media_quality_score, a.completeness_score, a.commute_cache, ae.description_embedding
      ORDER BY ae.description_embedding <=> $1::vector
      LIMIT $2 OFFSET $3
    `,
      [embedding, limit, filters.offset ?? 0],
    );

    return rows.map((row: any, idx: number) => {
      const similarity = typeof row.similarity === 'number' ? row.similarity : 0;
      const score = Math.max(0.6, 1 - similarity - idx * 0.01);
      return this.mapRowToResult(row, 'semantic', score, filters);
    });
  }

  async hybridSearch(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    const [structured, keyword, semantic] = await Promise.all([
      this.structuredSearch(filters),
      query ? this.keywordSearch(query, filters) : Promise.resolve([]),
      query ? this.semanticSearch(query, filters) : Promise.resolve([]),
    ]);

    return this.mergeAndRankResults([structured, keyword, semantic]);
  }

  mergeResults(resultSets: SearchResult[][], weights: number[]): SearchResult[] {
    if (!resultSets.length) {
      return [];
    }

    const weightedSets = resultSets.map((set, idx) => {
      const weight = weights[idx] ?? 1;
      return set.map((entry) => ({
        ...entry,
        score: Number((entry.score * weight).toFixed(4)),
      }));
    });

    return this.mergeAndRankResults(weightedSets);
  }

  private mergeAndRankResults(resultSets: SearchResult[][]): SearchResult[] {
    const combined = new Map<string, SearchResult>();

    resultSets.forEach((set) => {
      set.forEach((result) => {
        const existing = combined.get(result.apartment.id);
        if (!existing) {
          combined.set(result.apartment.id, result);
          return;
        }

        const mergedScore = Math.max(existing.score, result.score);
        const mergedReasons = Array.from(new Set([...existing.reasons, ...result.reasons]));
        const mergedReasonCodes = Array.from(new Set([...existing.reasonCodes, ...result.reasonCodes]));

        combined.set(result.apartment.id, {
          ...existing,
          score: mergedScore,
          reasons: mergedReasons,
          reasonCodes: mergedReasonCodes,
          source: existing.source === 'structured' ? result.source : existing.source,
        });
      });
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, DEFAULT_LIMIT);
  }

  private buildSortClause(sortBy?: SortOption, hasLocation = true): string {
    switch (sortBy) {
      case 'price_asc':
        return 'a.monthly_rent_huf ASC';
      case 'price_desc':
        return 'a.monthly_rent_huf DESC';
      case 'distance':
        return hasLocation ? 'distance_meters ASC NULLS LAST' : 'a.monthly_rent_huf ASC';
      case 'newest':
        return 'a.created_at DESC NULLS LAST';
      default:
        return 'a.completeness_score DESC NULLS LAST, a.media_quality_score DESC NULLS LAST, a.created_at DESC NULLS LAST';
    }
  }

  private buildMeiliFilters(filters: SearchFilters): string[] {
    const conditions: string[] = [];
    if (filters.budget) {
      conditions.push(`price >= ${filters.budget.min}`, `price <= ${filters.budget.max}`);
    }
    if (filters.rooms) {
      conditions.push(`rooms >= ${filters.rooms}`);
    }
    if (filters.furnished !== undefined) {
      conditions.push(`furnished = ${filters.furnished ? 'true' : 'false'}`);
    }
    if (filters.district) {
      const safeDistrict = filters.district.replace(/"/g, '\\"');
      conditions.push(`district = "${safeDistrict}"`);
    }
    if (filters.amenities?.length) {
      filters.amenities.forEach((amenity) => {
        const safeAmenity = amenity.replace(/"/g, '\\"');
        conditions.push(`amenities = "${safeAmenity}"`);
      });
    }
    return conditions;
  }

  private mapRowToResult(
    row: any,
    source: SearchResult['source'],
    baselineScore: number,
    filters?: SearchFilters,
  ): SearchResult {
    const reasons = new Set<string>();
    const reasonCodes = new Set<string>();

    const mediaQuality =
      row.media_quality_score === null || row.media_quality_score === undefined
        ? null
        : Number(row.media_quality_score);
    const completenessScore =
      row.completeness_score === null || row.completeness_score === undefined
        ? null
        : Number(row.completeness_score);
    const distanceMeters =
      row.distance_meters === null || row.distance_meters === undefined
        ? null
        : Number(row.distance_meters);

    const amenities = toStringArray(row.amenities ?? row.amenity_names);
    const amenityMatch =
      filters?.amenities?.length
        ? filters.amenities.some((amenity) => amenities.includes(amenity))
        : amenities.length > 0;
    if (amenityMatch) {
      reasons.add('Matches requested amenities');
      reasonCodes.add('amenity_match');
    }

    const ownerVerified = Boolean(
      typeof row.owner_verified === 'boolean'
        ? row.owner_verified
        : row.verification_status === 'verified',
    );

    if (ownerVerified) {
      reasons.add('Verified owner');
      reasonCodes.add('verified_owner');
    }

    if (mediaQuality !== null && mediaQuality > 0.75) {
      reasons.add('High-quality photos');
      reasonCodes.add('high_media_quality');
    }

    const commuteMinutes =
      typeof row.commute_minutes === 'number'
        ? row.commute_minutes
        : extractCommuteMinutes(row.commute_cache, filters?.university);

    if (typeof commuteMinutes === 'number') {
      reasons.add(`~${Math.round(commuteMinutes)} min to target campus`);
      if (commuteMinutes <= 20) {
        reasonCodes.add('short_commute');
      }
    }

    if (distanceMeters !== null && distanceMeters < 2000) {
      reasons.add('Close to your preferred location');
      reasonCodes.add('close_by');
    }

    const districtNumber = parseInt(String(row.district).replace(/\D/g, ''), 10);
    if (!Number.isNaN(districtNumber) && districtNumber <= 6) {
      reasons.add('Central district');
      reasonCodes.add('central_location');
    }

    if (!reasons.size) {
      reasons.add('Good match based on filters');
      reasonCodes.add('general_match');
    }

    return {
      apartment: {
        id: row.id,
        title: row.title,
        description: row.description,
        price: row.price,
        rooms: row.rooms,
        location: { lat: row.latitude, lng: row.longitude },
        address: row.address,
        district: row.district,
        amenities,
        photos: toStringArray(row.photo_urls ?? row.photos ?? []).slice(0, MAX_PHOTO_RESULTS),
        owner: {
          name: row.owner_name ?? 'Owner',
          verified: ownerVerified,
        },
        metrics: {
          mediaQuality,
          completeness: completenessScore,
          commuteMinutes: typeof commuteMinutes === 'number' ? commuteMinutes : null,
          suggestedPrice: row.suggested_price ?? null,
        },
      },
      score: Number(baselineScore.toFixed(4)),
      distance: distanceMeters,
      reasons: Array.from(reasons),
      reasonCodes: Array.from(reasonCodes),
      source,
    };
  }

  private mapHitToResult(hit: any, source: SearchResult['source'], score: number): SearchResult {
    const reasons: string[] = hit.reasons || ['Keyword match'];
    const reasonCodes: string[] = hit.reason_codes || ['text_match'];
    const amenities = toStringArray(hit.amenities);
    const photos = toStringArray(hit.photos).slice(0, MAX_PHOTO_RESULTS);

    return {
      apartment: {
        id: hit.id,
        title: hit.title,
        description: hit.description,
        price: hit.price,
        rooms: hit.rooms,
        location: { lat: hit.latitude, lng: hit.longitude },
        address: hit.address,
        district: hit.district,
        amenities,
        photos,
        owner: {
          name: hit.owner_name || 'Owner',
          verified: Boolean(hit.owner_verified),
        },
        metrics: {
          mediaQuality: hit.media_quality_score ?? null,
          completeness: hit.completeness_score ?? null,
          commuteMinutes: hit.commute_minutes ?? null,
          suggestedPrice: hit.suggested_price ?? null,
        },
      },
      score: Number(score.toFixed(4)),
      reasons: hit.reasons || ['Keyword match'],
      reasonCodes,
      source,
    };
  }
}

function toStringArray(input: unknown): string[] {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    const values = input
      .map((value) => {
        if (typeof value === 'string') return value;
        if (value === null || value === undefined) return null;
        return String(value);
      })
      .filter((value): value is string => Boolean(value && value.trim()));

    return Array.from(new Set(values));
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return toStringArray(parsed);
      }
    } catch {
      // Not JSON; treat as single value
    }
    return [trimmed];
  }

  return [];
}

function extractCommuteMinutes(commuteCache: unknown, targetUniversity?: string): number | null {
  if (!commuteCache) {
    return null;
  }

  let data: any = commuteCache;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  if (!data || typeof data !== 'object') {
    return null;
  }

  const universities = targetUniversity ? [targetUniversity] : Object.keys(data);
  let best: number | null = null;

  for (const university of universities) {
    const uniEntry = data[university];
    if (!uniEntry || typeof uniEntry !== 'object') continue;

    for (const modeEntry of Object.values(uniEntry) as Array<{ minutes?: number; travelMinutes?: number; travel_minutes?: number } | null>) {
      if (!modeEntry || typeof modeEntry !== 'object') continue;
      const rawMinutes =
        modeEntry.minutes ??
        modeEntry.travelMinutes ??
        modeEntry.travel_minutes ??
        null;

      const minutes = typeof rawMinutes === 'number' ? rawMinutes : Number(rawMinutes);
      if (!Number.isFinite(minutes)) continue;

      if (best === null || minutes < best) {
        best = minutes;
      }
    }
  }

  return best;
}

export const searchService = new SearchServiceImpl();





