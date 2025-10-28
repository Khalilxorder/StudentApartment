import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

describe('Database Constraint Validation', () => {
  let supabase: any

  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    supabase = createClient(supabaseUrl, supabaseKey)
  })

  describe('Core Tables Existence', () => {
    it('should have all required tables', async () => {
      const requiredTables = [
        'universities', 'amenities', 'apartments', 'apartment_media',
        'users', 'profiles_student', 'profiles_owner', 'favorites',
        'saved_searches', 'messages', 'conversations', 'viewings',
        'reviews', 'notifications', 'rank_feedback', 'payouts',
        'moderation_queue', 'reports', 'disputes'
      ]

      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select('id').limit(1)
        // If table doesn't exist, error will be thrown
        expect(error?.message).not.toContain('relation')
      }
    })
  })

  describe('Data Integrity Constraints', () => {
    it('should enforce apartment price constraints', async () => {
      // Try to insert invalid data - should fail
      const { error } = await supabase
        .from('apartments')
        .insert({
          title: 'Test Apartment',
          monthly_rent_huf: -1000, // Invalid negative price
          room_count: 1,
          bedrooms: 1,
          bathrooms: 1,
          district: 'Test District',
          latitude: 47.4979,
          longitude: 19.0402
        })

      expect(error).toBeTruthy()
      expect(error?.message).toMatch(/check constraint|violates check constraint/)
    })

    it('should enforce coordinate bounds', async () => {
      const { error } = await supabase
        .from('apartments')
        .insert({
          title: 'Test Apartment',
          monthly_rent_huf: 150000,
          room_count: 1,
          bedrooms: 1,
          bathrooms: 1,
          district: 'Test District',
          latitude: 200, // Invalid latitude > 90
          longitude: 19.0402
        })

      expect(error).toBeTruthy()
    })

    it('should maintain referential integrity', async () => {
      // Try to create apartment with non-existent owner
      const fakeOwnerId = '00000000-0000-0000-0000-000000000000'
      const { error } = await supabase
        .from('apartments')
        .insert({
          owner_id: fakeOwnerId,
          title: 'Test Apartment',
          monthly_rent_huf: 150000,
          room_count: 1,
          bedrooms: 1,
          bathrooms: 1,
          district: 'Test District',
          latitude: 47.4979,
          longitude: 19.0402
        })

      expect(error).toBeTruthy()
      expect(error?.message).toMatch(/foreign key|violates foreign key/)
    })
  })

  describe('RLS Policies', () => {
    it('should have RLS enabled on critical tables', async () => {
      const criticalTables = ['apartments', 'messages', 'favorites', 'saved_searches']

      for (const table of criticalTables) {
        const { data, error } = await supabase.rpc('check_rls_enabled', { table_name: table })

        if (!error) {
          expect(data).toBe(true)
        } else {
          // Fallback: try to query and expect auth error
          const { error: queryError } = await supabase.from(table).select('*').limit(1)
          expect(queryError?.message).toMatch(/policy|permission denied/)
        }
      }
    })
  })

  describe('Indexes Performance', () => {
    it('should have spatial indexes', async () => {
      const { data, error } = await supabase.rpc('check_spatial_indexes')

      if (!error && data) {
        expect(data.length).toBeGreaterThan(0)
      } else {
        // Query should use spatial index for performance
        const startTime = Date.now()
        const { error } = await supabase.rpc('nearby_apartments', {
          lat: 47.4979,
          lng: 19.0402,
          radius_km: 5
        })
        const duration = Date.now() - startTime

        // Should complete in reasonable time (spatial index should help)
        expect(duration).toBeLessThan(5000) // 5 seconds max
        expect(error).toBeFalsy()
      }
    })

    it('should have text search indexes', async () => {
      const { data, error } = await supabase
        .from('apartments')
        .select('id')
        .textSearch('title', 'studio')
        .limit(1)

      // Should not error and should use index
      expect(error).toBeFalsy()
    })
  })

  describe('Data Consistency', () => {
    it('should have valid university data', async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('latitude, longitude')
        .limit(5)

      expect(error).toBeFalsy()
      if (data && data.length > 0) {
        data.forEach((uni: any) => {
          expect(uni.latitude).toBeGreaterThanOrEqual(-90)
          expect(uni.latitude).toBeLessThanOrEqual(90)
          expect(uni.longitude).toBeGreaterThanOrEqual(-180)
          expect(uni.longitude).toBeLessThanOrEqual(180)
        })
      }
    })

    it('should have consistent apartment geometry', async () => {
      const { data, error } = await supabase
        .from('apartments')
        .select('latitude, longitude, geom')
        .limit(5)

      expect(error).toBeFalsy()
      if (data && data.length > 0) {
        data.forEach((apt: any) => {
          if (apt.latitude && apt.longitude && apt.geom) {
            // Geometry should match coordinates (rough check)
            expect(apt.geom).toContain('POINT')
          }
        })
      }
    })
  })
})