import 'dotenv/config';
import { MeiliSearch } from 'meilisearch';
import { Client } from 'pg';

interface ApartmentRow {
  id: string;
  title: string;
  description: string | null;
  price: number;
  rooms: number;
  size_sqm: number | null;
  amenities: string[] | null;
  furnished: boolean | null;
  has_elevator: boolean | null;
  balcony: boolean | null;
  district: string;
  latitude: number | null;
  longitude: number | null;
  owner_name: string | null;
  owner_verified: boolean | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
  view_count: number | null;
  save_count: number | null;
}

const resolveDatabaseUrl = (): string => {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POSTGRES_URL;

  if (!url) {
    throw new Error(
      'MEILISEARCH SYNC: DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_POSTGRES_URL) must be defined.'
    );
  }

  return url;
};

class MeilisearchSync {
  private meiliClient = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY,
  });

  private pgClient = new Client({
    connectionString: resolveDatabaseUrl(),
    ssl: /supabase\.co|supabase\.net/.test(resolveDatabaseUrl())
      ? { rejectUnauthorized: false }
      : undefined,
  });

  async sync(): Promise<void> {
    console.log('🚀 Starting Meilisearch incremental sync…');

    try {
      await this.pgClient.connect();
      await this.ensureIndex();

      const apartments = await this.fetchApartments(`
        WHERE a.status = 'published'
          AND a.is_available = true
          AND a.updated_at > NOW() - INTERVAL '24 hours'
      `);

      if (apartments.length === 0) {
        console.log('ℹ️  Nothing to sync – no recent updates.');
        return;
      }

      await this.pushDocuments(apartments);
      console.log(`✅ Synced ${apartments.length} apartments to Meilisearch`);
    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      throw error;
    } finally {
      await this.pgClient.end();
    }
  }

  async fullReindex(): Promise<void> {
    console.log('🚀 Starting full Meilisearch reindex…');

    try {
      await this.pgClient.connect();

      try {
        await this.meiliClient.deleteIndex('apartments');
      } catch {
        // Index may not exist yet – ignore.
      }

      await this.ensureIndex();

      const apartments = await this.fetchApartments(`
        WHERE a.status = 'published'
          AND a.is_available = true
      `);

      await this.pushDocuments(apartments);
      console.log(`✅ Full reindex complete – indexed ${apartments.length} apartments`);
    } catch (error) {
      console.error('❌ Full reindex failed:', error);
      throw error;
    } finally {
      await this.pgClient.end();
    }
  }

  private async fetchApartments(whereClause: string): Promise<ApartmentRow[]> {
    const { rows } = await this.pgClient.query<ApartmentRow>(
      `
        SELECT
          a.id,
          a.title,
          a.description,
          a.monthly_rent_huf AS price,
          a.room_count AS rooms,
          a.size_sqm,
          array_remove(array_agg(DISTINCT aa.amenity_code), NULL) AS amenities,
          a.furnished,
          a.has_elevator,
          a.balcony,
          a.district,
          ST_Y(a.geom) AS latitude,
          ST_X(a.geom) AS longitude,
          p.full_name AS owner_name,
          COALESCE(p.verified, false) AS owner_verified,
          array_remove(array_agg(DISTINCT am.file_url), NULL) AS photos,
          a.created_at::text,
          a.updated_at::text,
          a.view_count,
          a.save_count
        FROM public.apartments a
        LEFT JOIN public.apartment_amenities aa ON aa.apartment_id = a.id
        LEFT JOIN public.apartment_media am ON am.apartment_id = a.id AND am.is_primary = true
        LEFT JOIN public.profiles p ON p.id = a.owner_id
        ${whereClause}
        GROUP BY a.id, p.full_name, p.verified, a.created_at, a.updated_at, a.view_count, a.save_count
        ORDER BY a.updated_at DESC
      `
    );

    return rows;
  }

  private async pushDocuments(apartments: ApartmentRow[]): Promise<void> {
    const documents = apartments.map(apartment => ({
      id: apartment.id,
      title: apartment.title,
      description: apartment.description,
      price: apartment.price,
      rooms: apartment.rooms,
      area_sqm: apartment.size_sqm,
      amenities: apartment.amenities ?? [],
      furnished: apartment.furnished ?? false,
      has_elevator: apartment.has_elevator ?? false,
      balcony: apartment.balcony ?? false,
      district: apartment.district,
      latitude: apartment.latitude,
      longitude: apartment.longitude,
      owner_name: apartment.owner_name ?? 'Verified owner',
      owner_verified: apartment.owner_verified ?? false,
      photos: apartment.photos ?? [],
      created_at: apartment.created_at,
      updated_at: apartment.updated_at,
      view_count: apartment.view_count ?? 0,
      save_count: apartment.save_count ?? 0,
      popularity_score: this.calculatePopularityScore(apartment),
    }));

    const index = this.meiliClient.index('apartments');
    await index.addDocuments(documents, { primaryKey: 'id' });
  }

  private async ensureIndex(): Promise<void> {
    const index = this.meiliClient.index('apartments');

    await index.updateSettings({
      filterableAttributes: [
        'price',
        'rooms',
        'area_sqm',
        'amenities',
        'furnished',
        'has_elevator',
        'balcony',
        'district',
        'owner_verified',
      ],
      sortableAttributes: [
        'price',
        'rooms',
        'area_sqm',
        'created_at',
        'updated_at',
        'view_count',
        'save_count',
        'popularity_score',
      ],
      searchableAttributes: ['title', 'description', 'district', 'amenities'],
      displayedAttributes: [
        'id',
        'title',
        'description',
        'price',
        'rooms',
        'area_sqm',
        'amenities',
        'furnished',
        'has_elevator',
        'balcony',
        'district',
        'latitude',
        'longitude',
        'owner_name',
        'owner_verified',
        'photos',
        'popularity_score',
      ],
    });
  }

  private calculatePopularityScore(apartment: ApartmentRow): number {
    let score = 0;

    score += (apartment.view_count ?? 0) * 0.1;
    score += (apartment.save_count ?? 0) * 0.5;
    if (apartment.owner_verified) score += 10;
    if ((apartment.amenities?.length ?? 0) > 0) score += 5;
    if ((apartment.photos?.length ?? 0) > 0) score += 5;

    return score;
  }
}

async function main() {
  const command = process.argv[2] || 'sync';
  const syncService = new MeilisearchSync();

  try {
    if (command === 'reindex') {
      await syncService.fullReindex();
    } else if (command === 'sync') {
      await syncService.sync();
    } else {
      console.log('Usage: pnpm run sync:meilisearch [sync|reindex]');
      process.exit(1);
    }
  } catch (error) {
    console.error('Meilisearch sync failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MeilisearchSync };
