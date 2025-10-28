import 'dotenv/config';
import { Pool } from 'pg';
import {
  EXTENSION_STATEMENTS,
  REFERENCE_AMENITIES,
  REFERENCE_UNIVERSITIES,
  SAMPLE_APARTMENTS,
  SAMPLE_APP_USERS,
  SAMPLE_AUTH_USERS,
  SAMPLE_OWNER_PROFILES,
  SAMPLE_STUDENT_PROFILES,
} from './database-migrations';

const resolveDatabaseUrl = () => {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POSTGRES_URL;

  if (!url) {
    throw new Error(
      'Missing database connection string. Please set DATABASE_URL (or SUPABASE_DB_URL).',
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

const tableExists = async (schema: string, tableName: string): Promise<boolean> => {
  const { rows } = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists;
    `,
    [schema, tableName],
  );

  return rows[0]?.exists ?? false;
};

const ensureExtensions = async () => {
  for (const statement of EXTENSION_STATEMENTS) {
    await pool.query(statement);
  }
  console.log('[seed] extensions ensured');
};

const seedUniversities = async () => {
  if (!(await tableExists('public', 'universities'))) {
    console.log('[seed] skipping universities (table not found)');
    return;
  }

  for (const uni of REFERENCE_UNIVERSITIES) {
    await pool.query(
      `
        INSERT INTO public.universities (id, name, campus, latitude, longitude, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name,
              campus = EXCLUDED.campus,
              latitude = EXCLUDED.latitude,
              longitude = EXCLUDED.longitude,
              updated_at = NOW();
      `,
      [uni.id, uni.name, uni.campus, uni.latitude, uni.longitude],
    );
  }

  console.log('[seed] reference universities upserted');
};

const seedAuthUsers = async () => {
  if (!(await tableExists('auth', 'users'))) {
    console.log('[seed] skipping auth.users seeding (table not found)');
    return;
  }

  for (const user of SAMPLE_AUTH_USERS) {
    await pool.query(
      `
        INSERT INTO auth.users (
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          last_sign_in_at,
          raw_user_meta_data,
          raw_app_meta_data,
          is_super_admin,
          is_anonymous,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          'authenticated',
          'authenticated',
          $2,
          $3,
          NOW(),
          NOW(),
          '{}'::jsonb,
          '{}'::jsonb,
          false,
          false,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
          SET email = EXCLUDED.email,
              encrypted_password = EXCLUDED.encrypted_password,
              updated_at = NOW();
      `,
      [user.id, user.email, user.encryptedPassword],
    );
  }

  console.log('[seed] auth users upserted');
};

const seedAppUsers = async () => {
  if (!(await tableExists('public', 'users'))) {
    console.log('[seed] skipping public.users seeding (table not found)');
    return;
  }

  for (const user of SAMPLE_APP_USERS) {
    await pool.query(
      `
        INSERT INTO public.users (id, email, role, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
          SET email = EXCLUDED.email,
              role = EXCLUDED.role,
              updated_at = NOW();
      `,
      [user.id, user.email, user.role],
    );
  }

  console.log('[seed] application users upserted');
};

const seedStudentProfiles = async () => {
  if (!(await tableExists('public', 'profiles_student'))) {
    console.log('[seed] skipping profiles_student (table not found)');
    return;
  }

  for (const profile of SAMPLE_STUDENT_PROFILES) {
    await pool.query(
      `
        INSERT INTO public.profiles_student (
          id,
          full_name,
          university,
          budget_min,
          budget_max,
          move_in_date,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::date, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
          SET full_name = EXCLUDED.full_name,
              university = EXCLUDED.university,
              budget_min = EXCLUDED.budget_min,
              budget_max = EXCLUDED.budget_max,
              move_in_date = EXCLUDED.move_in_date,
              updated_at = NOW();
      `,
      [
        profile.id,
        profile.fullName,
        profile.university ?? null,
        profile.budgetMin ?? null,
        profile.budgetMax ?? null,
        profile.moveInDate ?? null,
      ],
    );
  }

  console.log('[seed] student profiles upserted');
};

const seedOwnerProfiles = async () => {
  if (!(await tableExists('public', 'profiles_owner'))) {
    console.log('[seed] skipping profiles_owner (table not found)');
    return;
  }

  for (const profile of SAMPLE_OWNER_PROFILES) {
    await pool.query(
      `
        INSERT INTO public.profiles_owner (
          id,
          full_name,
          phone,
          company_name,
          verification_status,
          payout_enabled,
          total_listings,
          active_listings,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 'verified', true, 0, 0, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
          SET full_name = EXCLUDED.full_name,
              phone = EXCLUDED.phone,
              company_name = EXCLUDED.company_name,
              verification_status = EXCLUDED.verification_status,
              updated_at = NOW();
      `,
      [profile.id, profile.fullName, profile.phone ?? null, profile.companyName ?? null],
    );
  }

  console.log('[seed] owner profiles upserted');
};

const seedAmenities = async () => {
  if (!(await tableExists('public', 'amenities'))) {
    console.log('[seed] skipping amenities (table not found)');
    return new Map<string, string>();
  }

  const amenityNameToId = new Map<string, string>();

  for (const amenity of REFERENCE_AMENITIES) {
    const { rows } = await pool.query<{ id: string }>(
      `
        INSERT INTO public.amenities (name, category, icon_url, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (name) DO UPDATE
          SET category = EXCLUDED.category,
              icon_url = EXCLUDED.icon_url
        RETURNING id;
      `,
      [amenity.name, amenity.category, null],
    );

    if (rows[0]?.id) {
      amenityNameToId.set(amenity.name, rows[0].id);
    }
  }

  console.log('[seed] amenities upserted');
  return amenityNameToId;
};

const toCommuteCacheJson = (
  commuteEntries: typeof SAMPLE_APARTMENTS[number]['commute'],
): Record<string, Record<string, { minutes: number; distanceMeters: number }>> => {
  const result: Record<string, Record<string, { minutes: number; distanceMeters: number }>> = {};

  for (const entry of commuteEntries) {
    if (!result[entry.university]) {
      result[entry.university] = {};
    }

    result[entry.university][entry.mode] = {
      minutes: entry.minutes,
      distanceMeters: entry.distanceMeters,
    };
  }

  return result;
};

const seedApartments = async (amenityNameToId: Map<string, string>) => {
  if (!(await tableExists('public', 'apartments'))) {
    console.log('[seed] skipping apartments (table not found)');
    return;
  }

  const apartmentAmenitiesEnabled = await tableExists('public', 'apartment_amenities');
  const amenityInsert = `
    INSERT INTO public.apartment_amenities (apartment_id, amenity_id)
    VALUES ($1, $2)
    ON CONFLICT (apartment_id, amenity_id) DO NOTHING;
  `;

  for (const apartment of SAMPLE_APARTMENTS) {
    const commuteCache = toCommuteCacheJson(apartment.commute);

    await pool.query(
      `
        INSERT INTO public.apartments (
          id,
          owner_id,
          verified_owner_id,
          title,
          description,
          address,
          city,
          district,
          geom,
          latitude,
          longitude,
          property_type,
          room_count,
          bathroom_count,
          area_sqm,
          furnished,
          utilities_included,
          monthly_rent_huf,
          available_from,
          status,
          completeness_score,
          media_score,
          commute_cache,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $2,
          $3,
          $4,
          $5,
          'Budapest',
          $6,
          ST_SetSRID(ST_MakePoint($8, $7), 4326),
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16::date,
          'published',
          $17,
          $18,
          $19::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          owner_id = EXCLUDED.owner_id,
          verified_owner_id = EXCLUDED.verified_owner_id,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          district = EXCLUDED.district,
          geom = EXCLUDED.geom,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          property_type = EXCLUDED.property_type,
          room_count = EXCLUDED.room_count,
          bathroom_count = EXCLUDED.bathroom_count,
          area_sqm = EXCLUDED.area_sqm,
          furnished = EXCLUDED.furnished,
          utilities_included = EXCLUDED.utilities_included,
          monthly_rent_huf = EXCLUDED.monthly_rent_huf,
          available_from = EXCLUDED.available_from,
          status = EXCLUDED.status,
          completeness_score = EXCLUDED.completeness_score,
          media_score = EXCLUDED.media_score,
          commute_cache = EXCLUDED.commute_cache,
          updated_at = NOW();
      `,
      [
        apartment.id,
        apartment.ownerId,
        apartment.title,
        apartment.description,
        apartment.address,
        apartment.district,
        apartment.latitude,
        apartment.longitude,
        apartment.propertyType,
        apartment.roomCount,
        apartment.bathroomCount,
        apartment.areaSqm,
        apartment.furnished,
        apartment.utilitiesIncluded,
        apartment.monthlyRentHuf,
        apartment.availableFrom,
        apartment.completenessScore,
        apartment.mediaScore,
        JSON.stringify(commuteCache),
      ],
    );

    if (apartmentAmenitiesEnabled) {
      for (const amenityName of apartment.amenityNames) {
        const amenityId = amenityNameToId.get(amenityName);
        if (!amenityId) {
          continue;
        }

        await pool.query(amenityInsert, [apartment.id, amenityId]);
      }
    }
  }

  console.log('[seed] apartments upserted');
};

export const seedDatabase = async () => {
  console.log('[seed] starting database seed');

  try {
    await ensureExtensions();
    await seedAuthUsers();
    await seedAppUsers();
    await seedStudentProfiles();
    await seedOwnerProfiles();
    await seedUniversities();
    const amenityNameToId = await seedAmenities();
    await seedApartments(amenityNameToId);

    console.log('[seed] database seeding completed successfully');
  } catch (error) {
    console.error('[seed] database seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  seedDatabase().catch(() => {
    process.exitCode = 1;
  });
}
