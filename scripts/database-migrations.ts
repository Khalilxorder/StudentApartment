export const EXTENSION_STATEMENTS = [
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
  'CREATE EXTENSION IF NOT EXISTS "postgis";',
  'CREATE EXTENSION IF NOT EXISTS "vector";',
  'CREATE EXTENSION IF NOT EXISTS "pg_trgm";',
];

export interface UniversitySeed {
  id: string;
  name: string;
  campus: string;
  latitude: number;
  longitude: number;
}

export const REFERENCE_UNIVERSITIES: UniversitySeed[] = [
  {
    id: 'elte',
    name: 'Eotvos Lorand University',
    campus: 'Central Campus',
    latitude: 47.4816,
    longitude: 19.0585,
  },
  {
    id: 'bme',
    name: 'Budapest University of Technology and Economics',
    campus: 'Danube Campus',
    latitude: 47.4814,
    longitude: 19.0605,
  },
  {
    id: 'corvinus',
    name: 'Corvinus University of Budapest',
    campus: 'Main Campus',
    latitude: 47.486,
    longitude: 19.0584,
  },
  {
    id: 'bge',
    name: 'Budapest Business School',
    campus: 'Finance and Accountancy',
    latitude: 47.5127,
    longitude: 19.0345,
  },
];

export const DEFAULT_PASSWORD_HASH =
  '$2a$12$wYyFkWDXLI4YAlnXrhIR3.BsQwFWwAXExVxV2xtgztqKqRR3YKHyW'; // bcrypt hash for "Password123"

export interface AuthUserSeed {
  id: string;
  email: string;
  encryptedPassword: string;
}

export const SAMPLE_AUTH_USERS: AuthUserSeed[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    encryptedPassword: DEFAULT_PASSWORD_HASH,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'owner@example.com',
    encryptedPassword: DEFAULT_PASSWORD_HASH,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'owner2@example.com',
    encryptedPassword: DEFAULT_PASSWORD_HASH,
  },
];

export interface AppUserSeed {
  id: string;
  email: string;
  role: 'student' | 'owner' | 'admin';
}

export const SAMPLE_APP_USERS: AppUserSeed[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    role: 'student',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'owner@example.com',
    role: 'owner',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'owner2@example.com',
    role: 'owner',
  },
];

export interface StudentProfileSeed {
  id: string;
  fullName: string;
  university?: string;
  budgetMin?: number;
  budgetMax?: number;
  moveInDate?: string;
}

export const SAMPLE_STUDENT_PROFILES: StudentProfileSeed[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    fullName: 'Anna Kovacs',
    university: 'Eotvos Lorand University',
    budgetMin: 110000,
    budgetMax: 180000,
    moveInDate: '2025-09-01',
  },
];

export interface OwnerProfileSeed {
  id: string;
  fullName: string;
  phone?: string;
  companyName?: string;
}

export const SAMPLE_OWNER_PROFILES: OwnerProfileSeed[] = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    fullName: 'Balazs Nagy',
    phone: '+36 30 123 4567',
    companyName: 'Danube Rentals Kft',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    fullName: 'Zsuzsa Toth',
    phone: '+36 70 987 6543',
    companyName: 'City Living Bt',
  },
];

export interface AmenitySeed {
  name: string;
  category: string;
  description: string;
}

export const REFERENCE_AMENITIES: AmenitySeed[] = [
  {
    name: 'High-speed WiFi',
    category: 'connectivity',
    description: 'Reliable high-speed wireless internet throughout the apartment.',
  },
  {
    name: 'Furnished',
    category: 'comfort',
    description: 'Move-in ready with essential furniture provided.',
  },
  {
    name: 'Fully Equipped Kitchen',
    category: 'comfort',
    description: 'Modern kitchen with hob, oven, microwave, and cookware.',
  },
  {
    name: 'In-unit Laundry',
    category: 'comfort',
    description: 'Washer and dryer available inside the apartment.',
  },
  {
    name: 'Private Balcony',
    category: 'outdoor',
    description: 'Outdoor space perfect for relaxing or studying.',
  },
  {
    name: 'Elevator Access',
    category: 'accessibility',
    description: 'Step-free access via a maintained elevator.',
  },
  {
    name: 'Bike Storage',
    category: 'mobility',
    description: 'Secure area to store bicycles.',
  },
  {
    name: 'Secure Entry',
    category: 'safety',
    description: 'Controlled entry and CCTV in communal areas.',
  },
  {
    name: 'Parking Spot',
    category: 'mobility',
    description: 'Dedicated parking spot available for tenants.',
  },
  {
    name: 'Pet Friendly',
    category: 'policies',
    description: 'Pets are welcome subject to house rules.',
  },
];

export interface ApartmentCommuteInfo {
  university: string;
  mode: 'walking' | 'transit' | 'bicycling' | 'driving';
  minutes: number;
  distanceMeters: number;
}

export interface ApartmentSeed {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  roomCount: number;
  bathroomCount: number;
  areaSqm: number;
  furnished: boolean;
  utilitiesIncluded: boolean;
  monthlyRentHuf: number;
  availableFrom: string;
  completenessScore: number;
  mediaScore: number;
  amenityNames: string[];
  commute: ApartmentCommuteInfo[];
}

export const SAMPLE_APARTMENTS: ApartmentSeed[] = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    ownerId: '22222222-2222-4222-8222-222222222222',
    title: 'Cozy Studio near ELTE',
    description: 'Light-filled studio minutes from campus with modern furnishings and fast WiFi.',
    address: 'Ferenciek tere 2, 1053 Budapest',
    district: 'District 5',
    latitude: 47.4922,
    longitude: 19.0578,
    propertyType: 'studio',
    roomCount: 1,
    bathroomCount: 1,
    areaSqm: 32,
    furnished: true,
    utilitiesIncluded: true,
    monthlyRentHuf: 120000,
    availableFrom: '2025-09-01',
    completenessScore: 0.82,
    mediaScore: 0.78,
    amenityNames: ['High-speed WiFi', 'Furnished', 'Fully Equipped Kitchen'],
    commute: [
      { university: 'Eotvos Lorand University', mode: 'walking', minutes: 8, distanceMeters: 600 },
      { university: 'Corvinus University of Budapest', mode: 'transit', minutes: 10, distanceMeters: 1800 },
    ],
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    ownerId: '33333333-3333-4333-8333-333333333333',
    title: 'Modern Two Bedroom in District 6',
    description: 'Renovated apartment with balcony, elevator access, and skyline views.',
    address: 'Kiraly utca 12, 1061 Budapest',
    district: 'District 6',
    latitude: 47.5034,
    longitude: 19.0581,
    propertyType: 'apartment',
    roomCount: 3,
    bathroomCount: 1,
    areaSqm: 54,
    furnished: true,
    utilitiesIncluded: false,
    monthlyRentHuf: 190000,
    availableFrom: '2025-08-15',
    completenessScore: 0.88,
    mediaScore: 0.85,
    amenityNames: ['High-speed WiFi', 'Furnished', 'Private Balcony', 'Elevator Access'],
    commute: [
      { university: 'Eotvos Lorand University', mode: 'transit', minutes: 12, distanceMeters: 2200 },
      {
        university: 'Budapest University of Technology and Economics',
        mode: 'transit',
        minutes: 18,
        distanceMeters: 3600,
      },
    ],
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    ownerId: '22222222-2222-4222-8222-222222222222',
    title: 'Riverside Apartment for BME Students',
    description: 'Bright riverside apartment with bike storage and quick tram to BME.',
    address: 'Bartok Bela ut 4, 1111 Budapest',
    district: 'District 11',
    latitude: 47.4779,
    longitude: 19.0475,
    propertyType: 'apartment',
    roomCount: 2,
    bathroomCount: 1,
    areaSqm: 40,
    furnished: true,
    utilitiesIncluded: true,
    monthlyRentHuf: 145000,
    availableFrom: '2025-07-01',
    completenessScore: 0.86,
    mediaScore: 0.8,
    amenityNames: ['High-speed WiFi', 'In-unit Laundry', 'Secure Entry', 'Bike Storage'],
    commute: [
      {
        university: 'Budapest University of Technology and Economics',
        mode: 'bicycling',
        minutes: 7,
        distanceMeters: 1800,
      },
      { university: 'Eotvos Lorand University', mode: 'transit', minutes: 16, distanceMeters: 3200 },
    ],
  },
];

export const POSTGIS_MIGRATION = `
-- PostGIS and pgvector setup
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create spatial index function
CREATE OR REPLACE FUNCTION create_spatial_indexes() RETURNS void AS $$
BEGIN
  -- Add spatial indexes for location-based queries
  CREATE INDEX IF NOT EXISTS idx_apartments_location ON apartments USING gist (ST_Point(longitude, latitude));
  CREATE INDEX IF NOT EXISTS idx_universities_location ON universities USING gist (ST_Point(longitude, latitude));
END;
$$ LANGUAGE plpgsql;
`;

export const SEED_DATA_MIGRATION = `
-- Seed universities
INSERT INTO universities (id, name, campus, latitude, longitude, created_at, updated_at)
VALUES
  ('elte', 'Eotvos Lorand University', 'Central Campus', 47.4816, 19.0585, NOW(), NOW()),
  ('bme', 'Budapest University of Technology and Economics', 'Danube Campus', 47.4814, 19.0605, NOW(), NOW()),
  ('corvinus', 'Corvinus University of Budapest', 'Main Campus', 47.486, 19.0584, NOW(), NOW()),
  ('bge', 'Budapest Business School', 'Finance and Accountancy', 47.5127, 19.0345, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed user profiles for testing
INSERT INTO user_profiles (user_id, user_type, identity_verified, created_at, updated_at)
VALUES
  ('test-owner-1', 'owner', true, NOW(), NOW()),
  ('test-student-1', 'student', true, NOW(), NOW()),
  ('test-admin-1', 'admin', true, NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;
`;
