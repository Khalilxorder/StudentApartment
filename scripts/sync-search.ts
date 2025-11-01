// Synchronisation utilities for search, embeddings, and commute data.
// These scripts keep Meilisearch and pgvector in step with the relational data.

import { MeiliSearch } from 'meilisearch';
import { Client } from 'pg';
import { embeddingService } from '../lib/embeddings';
import { commuteService } from '../services/commute-svc';

const DEFAULT_DATABASE_URL = process.env.DATABASE_URL;

function assertDatabaseUrl(): string {
  if (!DEFAULT_DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined to run search sync scripts.');
  }
  return DEFAULT_DATABASE_URL;
}

export class SearchSyncService {
  private meiliClient = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY,
  });

  private createPgClient(): Client {
    return new Client({ connectionString: assertDatabaseUrl() });
  }

  async syncApartmentsToMeilisearch() {
    console.log('🔄 Syncing apartments to Meilisearch…');
    const pg = this.createPgClient();

    try {
      await pg.connect();
      const { rows } = await pg.query(`
        SELECT
          a.id,
          a.title,
          a.description,
          a.monthly_rent_huf,
          a.room_count,
          a.size_sqm,
          a.furnished,
          a.has_elevator,
          a.district,
          a.address,
          a.latitude,
          a.longitude,
          a.created_at,
          a.updated_at,
          COALESCE(op.display_name, 'Owner') AS owner_name,
          COALESCE(op.verified, false) AS owner_verified,
          (
            SELECT array_agg(am.file_url ORDER BY am.is_primary DESC, am.created_at ASC)
            FROM public.apartment_media am
            WHERE am.apartment_id = a.id
          ) AS photos,
          (
            SELECT array_agg(aa.amenity_code)
            FROM public.apartment_amenities aa
            WHERE aa.apartment_id = a.id
          ) AS amenities,
          (
            SELECT COUNT(*) FROM public.apartment_favorites fav WHERE fav.apartment_id = a.id
          ) AS favorite_count,
          (
            SELECT COUNT(*) FROM public.messages m WHERE m.apartment_id = a.id
          ) AS message_count
        FROM public.apartments a
        LEFT JOIN public.owner_profiles op ON op.id = a.owner_id
        WHERE a.status = 'published'
          AND a.is_available = true
          AND a.latitude IS NOT NULL
          AND a.longitude IS NOT NULL
        ORDER BY a.updated_at DESC;
      `);

      const documents = rows.map((row) => {
        const favorites = Number(row.favorite_count ?? 0);
        const messages = Number(row.message_count ?? 0);
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          price: row.monthly_rent_huf,
          rooms: row.room_count,
          size_sqm: row.size_sqm,
          amenities: row.amenities ?? [],
          furnished: row.furnished,
          has_elevator: row.has_elevator,
          district: row.district,
          address: row.address,
          latitude: row.latitude,
          longitude: row.longitude,
          owner_name: row.owner_name,
          owner_verified: row.owner_verified,
          photos: row.photos ?? [],
          created_at: row.created_at,
          updated_at: row.updated_at,
          favorite_count: favorites,
          message_count: messages,
          popularity_score: favorites * 0.6 + messages * 0.4,
        };
      });

      const index = this.meiliClient.index('apartments');
      await index.deleteAllDocuments();
      if (documents.length > 0) {
        await index.addDocuments(documents);
      }

      await index.updateSearchableAttributes([
        'title',
        'description',
        'district',
        'address',
        'amenities',
        'owner_name',
      ]);

      await index.updateFilterableAttributes([
        'district',
        'furnished',
        'has_elevator',
        'amenities',
      ]);

      await index.updateSortableAttributes([
        'price',
        'rooms',
        'size_sqm',
        'created_at',
        'popularity_score',
      ]);

      console.log(`✅ Synced ${documents.length} apartments to Meilisearch`);
    } catch (error) {
      console.error('❌ Failed to sync apartments to Meilisearch:', error);
      throw error;
    } finally {
      await pg.end();
    }
  }

  async syncEmbeddingsToPgvector() {
    console.log('🔄 Syncing apartment embeddings…');
    const pg = this.createPgClient();

    try {
      await pg.connect();
      const { rows } = await pg.query(`
        WITH apartment_data AS (
          SELECT
            a.id,
            a.title,
            a.description,
            COALESCE(array_agg(DISTINCT aa.amenity_code) FILTER (WHERE aa.amenity_code IS NOT NULL), ARRAY[]::text[]) AS amenities
          FROM public.apartments a
          LEFT JOIN public.apartment_amenities aa ON aa.apartment_id = a.id
          WHERE a.status = 'published'
            AND a.is_available = true
          GROUP BY a.id, a.title, a.description
        )
        SELECT ad.*
        FROM apartment_data ad
        WHERE NOT EXISTS (
          SELECT 1 FROM public.apartment_embeddings ae WHERE ae.apartment_id = ad.id
        )
        LIMIT 50;
      `);

      if (rows.length === 0) {
        console.log('ℹ️ No new apartments require embeddings');
        return;
      }

      for (const apartment of rows) {
        const titleEmbedding = await embeddingService.embedText(apartment.title);
        const descriptionEmbedding = await embeddingService.embedText(apartment.description);
        const amenitiesText = (apartment.amenities ?? []).join(' ');
        const amenityEmbedding = amenitiesText
          ? await embeddingService.embedText(`Amenities: ${amenitiesText}`)
          : new Float32Array(titleEmbedding.length);

        const featureEmbedding = embeddingService.combineEmbeddings([
          { vector: titleEmbedding, weight: 0.3 },
          { vector: descriptionEmbedding, weight: 0.3 },
          { vector: amenityEmbedding, weight: 0.4 },
        ]);

        await pg.query(
          `
            INSERT INTO public.apartment_embeddings (
              apartment_id,
              description_embedding,
              feature_embedding,
              updated_at
            )
            VALUES ($1, $2::vector, $3::vector, now())
            ON CONFLICT (apartment_id) DO UPDATE SET
              description_embedding = EXCLUDED.description_embedding,
              feature_embedding = EXCLUDED.feature_embedding,
              updated_at = now()
          `,
          [
            apartment.id,
            embeddingService.toSqlVector(descriptionEmbedding),
            embeddingService.toSqlVector(featureEmbedding),
          ],
        );

        await this.delay(50);
      }

      console.log(`✅ Generated embeddings for ${rows.length} apartments`);
    } catch (error) {
      console.error('❌ Failed to sync embeddings:', error);
      throw error;
    } finally {
      await pg.end();
    }
  }

  async syncUserSearchEmbeddings() {
    console.log('🔄 Syncing user search embeddings…');
    const pg = this.createPgClient();

    try {
      await pg.connect();
      const { rows } = await pg.query(`
        SELECT
          user_id,
          budget_min,
          budget_max,
          preferred_rooms,
          required_amenities,
          preferred_districts,
          max_commute_minutes,
          university
        FROM public.user_search_profiles
        WHERE search_embedding IS NULL
        LIMIT 50;
      `);

      if (rows.length === 0) {
        console.log('ℹ️ No user profiles require embeddings');
        return;
      }

      for (const profile of rows) {
        const searchText = this.buildSearchText(profile);
        const embedding = await embeddingService.embedText(searchText);
        // CRITICAL: Use 768 dimensions for text-embedding-004, not 1536
        embeddingService.validateDimensions(embedding, 768);

        await pg.query(
          `
            UPDATE public.user_search_profiles
            SET search_embedding = $1::vector,
                updated_at = now()
            WHERE user_id = $2
          `,
          [embeddingService.toSqlVector(embedding), profile.user_id],
        );

        await this.delay(50);
      }

      console.log(`✅ Generated embeddings for ${rows.length} user profiles`);
    } catch (error) {
      console.error('❌ Failed to sync user search embeddings:', error);
      throw error;
    } finally {
      await pg.end();
    }
  }

  async syncCommuteData() {
    console.log('🔄 Refreshing commute cache…');
    const pg = this.createPgClient();

    try {
      await pg.connect();
      const { rows: apartments } = await pg.query(`
        SELECT id, latitude, longitude
        FROM public.apartments
        WHERE status = 'published'
          AND is_available = true
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.commute_cache cc
            WHERE cc.apartment_id = public.apartments.id
              AND cc.updated_at > now() - interval '1 day'
          )
        ORDER BY updated_at DESC
        LIMIT 20;
      `);

      if (!apartments.length) {
        console.log('ℹ️ Commute cache already up to date');
        return;
      }

      const { rows: universities } = await pg.query(`
        SELECT id, latitude, longitude
        FROM public.universities;
      `);

      for (const apartment of apartments) {
        const location = {
          lat: Number(apartment.latitude),
          lng: Number(apartment.longitude),
        };

        for (const university of universities) {
          const uniLocation = {
            lat: Number(university.latitude),
            lng: Number(university.longitude),
          };

          for (const mode of ['transit', 'walking', 'bicycling', 'driving'] as const) {
            try {
              await commuteService.calculateCommute(location, university.id, mode, apartment.id);
              await this.delay(75);
            } catch (error) {
              console.warn(
                `⚠️ Commute calculation failed for apartment ${apartment.id} to ${university.id} (${mode}):`,
                error,
              );
            }
          }
        }
      }

      console.log(`✅ Updated commute cache for ${apartments.length} apartments`);
    } catch (error) {
      console.error('❌ Failed to sync commute data:', error);
      throw error;
    } finally {
      await pg.end();
    }
  }

  private buildSearchText(profile: any): string {
    const parts: string[] = [];

    if (profile.preferred_rooms?.length) {
      parts.push(`${profile.preferred_rooms.join(' or ')} bedrooms`);
    }

    if (profile.required_amenities?.length) {
      parts.push(`amenities: ${profile.required_amenities.join(', ')}`);
    }

    if (profile.preferred_districts?.length) {
      parts.push(`districts: ${profile.preferred_districts.join(', ')}`);
    }

    if (profile.university) {
      parts.push(`near ${profile.university}`);
    }

    if (profile.budget_min || profile.budget_max) {
      parts.push(
        `budget ${profile.budget_min ? `from ${profile.budget_min}` : ''} ${
          profile.budget_max ? `to ${profile.budget_max}` : ''
        } HUF`.trim(),
      );
    }

    if (profile.max_commute_minutes) {
      parts.push(`max commute ${profile.max_commute_minutes} minutes`);
    }

    return parts.join('. ');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const searchSyncService = new SearchSyncService();

export const syncAll = async () => {
  const service = new SearchSyncService();

  try {
    console.log('🚀 Running full search synchronisation pipeline…');
    await service.syncApartmentsToMeilisearch();
    await service.syncEmbeddingsToPgvector();
    await service.syncUserSearchEmbeddings();
    await service.syncCommuteData();
    console.log('🎉 Search synchronisation completed');
  } catch (error) {
    console.error('❌ Search synchronisation failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'meilisearch':
      searchSyncService.syncApartmentsToMeilisearch().catch(console.error);
      break;
    case 'embeddings':
      searchSyncService.syncEmbeddingsToPgvector().catch(console.error);
      break;
    case 'users':
      searchSyncService.syncUserSearchEmbeddings().catch(console.error);
      break;
    case 'commute':
      searchSyncService.syncCommuteData().catch(console.error);
      break;
    case 'all':
    default:
      syncAll().catch(console.error);
      break;
  }
}
