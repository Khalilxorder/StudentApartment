import 'dotenv/config';
import { Pool } from 'pg';
import { embeddingService } from '../lib/embeddings';

interface ApartmentEmbeddingRow {
  id: string;
  title: string | null;
  description: string | null;
  district: string | null;
  room_count: number | null;
  bathroom_count: number | null;
  furnished: boolean | null;
  amenities: string[] | null;
  updated_at: string;
  embedding_updated_at: string | null;
}

const resolveDatabaseUrl = (): string => {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POSTGRES_URL;

  if (!url) {
    throw new Error(
      'BUILD EMBEDDINGS: DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_POSTGRES_URL) must be defined.',
    );
  }

  return url;
};

const connectionString = resolveDatabaseUrl();

const pool = new Pool({
  connectionString,
  ssl: /supabase\.co|supabase\.net/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
});

const buildEmbeddingText = (apartment: ApartmentEmbeddingRow): string => {
  const lines = [
    apartment.title,
    apartment.description,
    apartment.district ? `District: ${apartment.district}` : null,
    apartment.room_count != null ? `Rooms: ${apartment.room_count}` : null,
    apartment.bathroom_count != null ? `Bathrooms: ${apartment.bathroom_count}` : null,
    apartment.furnished != null ? `Furnished: ${apartment.furnished ? 'Yes' : 'No'}` : null,
    apartment.amenities?.length ? `Amenities: ${apartment.amenities.join(', ')}` : null,
  ];

  return lines.filter(Boolean).join('\n');
};

const fetchBatch = async (limit: number): Promise<ApartmentEmbeddingRow[]> => {
  const { rows } = await pool.query<ApartmentEmbeddingRow>(
    `
      SELECT
        a.id,
        a.title,
        a.description,
        a.district,
        a.room_count,
        a.bathroom_count,
        a.furnished,
        array_remove(array_agg(DISTINCT am.name), NULL) AS amenities,
        a.updated_at::text,
        ae.updated_at::text AS embedding_updated_at
      FROM public.apartments a
      LEFT JOIN public.apartment_amenities aa ON aa.apartment_id = a.id
      LEFT JOIN public.amenities am ON am.id = aa.amenity_id
      LEFT JOIN public.apartment_embeddings ae ON ae.apartment_id = a.id
      WHERE a.status = 'published'
        AND (
          ae.apartment_id IS NULL
          OR ae.updated_at < a.updated_at
        )
      GROUP BY a.id, ae.updated_at, a.updated_at
      ORDER BY a.updated_at DESC
      LIMIT $1;
    `,
    [limit],
  );

  return rows;
};

const upsertEmbedding = async (apartmentId: string, vectorSql: string) => {
  await pool.query(
    `
      INSERT INTO public.apartment_embeddings (
        apartment_id,
        combined_embedding,
        updated_at
      ) VALUES ($1, $2::vector, NOW())
      ON CONFLICT (apartment_id) DO UPDATE
        SET combined_embedding = EXCLUDED.combined_embedding,
            updated_at = NOW();
    `,
    [apartmentId, vectorSql],
  );
};

export const buildEmbeddings = async (batchSize = 50) => {
  console.log('[embeddings] starting generation');

  try {
    const apartments = await fetchBatch(batchSize);

    if (apartments.length === 0) {
      console.log('[embeddings] no apartments require updates');
      return;
    }

    console.log(`[embeddings] generating vectors for ${apartments.length} apartments`);

    for (const apartment of apartments) {
      const embeddingText = buildEmbeddingText(apartment);
      const embeddingVector = embeddingService.toSqlVector(
        await embeddingService.embedText(embeddingText),
      );

      await upsertEmbedding(apartment.id, embeddingVector);
      console.log(`[embeddings] updated apartment ${apartment.id}`);
    }

    console.log('[embeddings] generation complete');
  } catch (error) {
    console.error('[embeddings] generation failed', error);
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  buildEmbeddings().catch(() => {
    process.exitCode = 1;
  });
}
