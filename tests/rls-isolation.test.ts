import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test RLS policies for data isolation
describe.skip('RLS Security Tests', () => {
  let supabase: any;
  let studentClient: any;
  let ownerClient: any;
  let adminClient: any;

  beforeAll(async () => {
    // Initialize Supabase client for testing
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Create test clients with different auth contexts
    studentClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    ownerClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  describe('Student Profile Access', () => {
    it('should allow students to view their own profile', async () => {
      // Authenticate as student
      const { data: authData } = await studentClient.auth.signInWithPassword({
        email: 'zsolt.toth@elte.hu',
        password: 'testpassword'
      });

      expect(authData.user).toBeTruthy();

      // Try to access own profile
      const { data, error } = await studentClient
        .from('profiles_student')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.university).toBe('ELTE');
    });

    it('should prevent students from viewing other students profiles', async () => {
      const { data: authData } = await studentClient.auth.signInWithPassword({
        email: 'zsolt.toth@elte.hu',
        password: 'testpassword'
      });

      // Try to access another student's profile
      const { data, error } = await studentClient
        .from('profiles_student')
        .select('*')
        .eq('id', 'student-002') // Different student
        .single();

      expect(data).toBeNull(); // Should return no data due to RLS
    });
  });

  describe('Owner Profile Access', () => {
    it('should allow owners to view their own profile', async () => {
      const { data: authData } = await ownerClient.auth.signInWithPassword({
        email: 'anna.kovacs@email.com',
        password: 'testpassword'
      });

      expect(authData.user).toBeTruthy();

      const { data, error } = await ownerClient
        .from('profiles_owner')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.verification_status).toBe('verified');
    });

    it('should prevent owners from viewing other owners profiles', async () => {
      const { data: authData } = await ownerClient.auth.signInWithPassword({
        email: 'anna.kovacs@email.com',
        password: 'testpassword'
      });

      const { data, error } = await ownerClient
        .from('profiles_owner')
        .select('*')
        .eq('id', 'owner-002') // Different owner
        .single();

      expect(data).toBeNull(); // Should return no data due to RLS
    });
  });

  describe('Apartment Access', () => {
    it('should allow anyone to view active apartments', async () => {
      const { data, error } = await supabase
        .from('apartments')
        .select('id, title, price, district')
        .eq('status', 'active')
        .limit(5);

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].status).toBeUndefined(); // Should not leak status
    });

    it('should allow owners to manage their own apartments', async () => {
      const { data: authData } = await ownerClient.auth.signInWithPassword({
        email: 'anna.kovacs@email.com',
        password: 'testpassword'
      });

      const { data, error } = await ownerClient
        .from('apartments')
        .select('*')
        .eq('owner_id', authData.user.id);

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });

    it('should prevent owners from viewing other owners apartments with sensitive data', async () => {
      const { data: authData } = await ownerClient.auth.signInWithPassword({
        email: 'anna.kovacs@email.com',
        password: 'testpassword'
      });

      // Try to access another owner's apartment
      const { data, error } = await ownerClient
        .from('apartments')
        .select('*')
        .eq('owner_id', 'owner-002') // Different owner
        .neq('status', 'active'); // Try to access non-active

      expect(data.length).toBe(0); // Should return no data due to RLS
    });
  });

  describe('Favorites Access', () => {
    it('should allow students to manage their own favorites', async () => {
      const { data: authData } = await studentClient.auth.signInWithPassword({
        email: 'zsolt.toth@elte.hu',
        password: 'testpassword'
      });

      // Add a favorite
      const { error: insertError } = await studentClient
        .from('favorites')
        .insert({
          user_id: authData.user.id,
          apartment_id: 'apt-001'
        });

      expect(insertError).toBeNull();

      // View favorites
      const { data, error } = await studentClient
        .from('favorites')
        .select('*')
        .eq('user_id', authData.user.id);

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });

    it('should prevent students from viewing other students favorites', async () => {
      const { data: authData } = await studentClient.auth.signInWithPassword({
        email: 'zsolt.toth@elte.hu',
        password: 'testpassword'
      });

      const { data, error } = await studentClient
        .from('favorites')
        .select('*')
        .eq('user_id', 'student-002'); // Different student

      expect(data.length).toBe(0); // Should return no data due to RLS
    });
  });

  describe('Admin Access', () => {
    it('should allow admins to view all data', async () => {
      const { data: authData } = await adminClient.auth.signInWithPassword({
        email: 'admin@studentapartments.hu',
        password: 'testpassword'
      });

      expect(authData.user).toBeTruthy();

      // Admins should be able to view all apartments
      const { data, error } = await adminClient
        .from('apartments')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });

    it('should allow admins to manage payouts', async () => {
      const { data: authData } = await adminClient.auth.signInWithPassword({
        email: 'admin@studentapartments.hu',
        password: 'testpassword'
      });

      const { data, error } = await adminClient
        .from('payouts')
        .select('*')
        .limit(5);

      // This should work for admins
      expect(error).toBeNull();
    });
  });

  describe('Viewings Access', () => {
    it('should allow owners to view viewings for their apartments', async () => {
      const { data: authData } = await ownerClient.auth.signInWithPassword({
        email: 'anna.kovacs@email.com',
        password: 'testpassword'
      });

      const { data, error } = await ownerClient
        .from('viewings')
        .select('*')
        .eq('owner_id', authData.user.id);

      expect(error).toBeNull();
    });

    it('should allow students to manage their viewings', async () => {
      const { data: authData } = await studentClient.auth.signInWithPassword({
        email: 'zsolt.toth@elte.hu',
        password: 'testpassword'
      });

      const { data, error } = await studentClient
        .from('viewings')
        .select('*')
        .eq('student_id', authData.user.id);

      expect(error).toBeNull();
    });
  });

  describe('Reports and Disputes', () => {
    it('should allow users to create reports', async () => {
      const { data: authData } = await studentClient.auth.signInWithPassword({
        email: 'zsolt.toth@elte.hu',
        password: 'testpassword'
      });

      const { error } = await studentClient
        .from('reports')
        .insert({
          reporter_id: authData.user.id,
          reported_user_id: 'owner-002',
          report_type: 'inappropriate_content',
          description: 'Test report for RLS testing'
        });

      expect(error).toBeNull();
    });

    it('should allow admins to manage reports', async () => {
      const { data: authData } = await adminClient.auth.signInWithPassword({
        email: 'admin@studentapartments.hu',
        password: 'testpassword'
      });

      const { data, error } = await adminClient
        .from('reports')
        .select('*')
        .limit(5);

      expect(error).toBeNull();
    });
  });
});