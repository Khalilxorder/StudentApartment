#!/usr/bin/env tsx
/**
 * Test script for Enhanced Duplicate Detection System
 * Generates realistic test data and validates detection accuracy
 */

import { enhancedDuplicateDetectionService } from '@/services/duplicate-detection-svc';
import { createClient } from '@/utils/supabaseClient';

// Sample realistic apartment data
const TEST_APARTMENTS = [
  {
    id: 'test-apt-1',
    title: 'Modern 2BR Apartment near University Campus',
    description: 'Beautiful modern 2-bedroom apartment with stunning city views. Features hardwood floors, fully equipped kitchen, spacious living room with large windows. Ideal for students. Walking distance to university campus and public transport.',
    address: '42 Andrássy Avenue, Budapest',
    latitude: 47.5145,
    longitude: 19.0643,
    owner_id: 'owner-1',
    // Note: amenities are handled via separate apartment_amenities table
  },
  {
    // Exact duplicate (same owner, same address)
    id: 'test-apt-2',
    title: 'Modern 2BR Apartment near University Campus',
    description: 'Beautiful modern 2-bedroom apartment with stunning city views. Features hardwood floors, fully equipped kitchen, spacious living room with large windows. Ideal for students. Walking distance to university campus and public transport.',
    address: '42 Andrássy Avenue, Budapest',
    latitude: 47.5145,
    longitude: 19.0643,
    owner_id: 'owner-1',
  },
  {
    // Different unit, same building
    id: 'test-apt-3',
    title: '2 Bedroom Flat in Historic Building',
    description: 'Spacious 2-bedroom apartment located on 4th floor. Modern amenities, excellent natural light. Close to public transportation and shopping. Perfect for student accommodation.',
    address: '42 Andrássy Avenue, Budapest',
    latitude: 47.51451,
    longitude: 19.06432,
    owner_id: 'owner-2',
  },
  {
    // Different address, different owner (should not match)
    id: 'test-apt-4',
    title: '3 Bedroom Family Home',
    description: 'Spacious family home with garden and garage. Three bedrooms, modern kitchen, perfect for families. Quiet residential area.',
    address: '10 Döbrentei Street, Budapest',
    latitude: 47.4962,
    longitude: 19.0358,
    owner_id: 'owner-3',
  },
];

async function runTests() {
  const supabase = createClient();
  
  console.log('🧪 Enhanced Duplicate Detection System - Test Suite\n');
  console.log('=' .repeat(60));

  try {
    // 1. Clean up any existing test data
    console.log('\n📋 Cleaning up existing test data...');
    const { data: existing } = await supabase
      .from('apartments')
      .select('id')
      .in('id', TEST_APARTMENTS.map(a => a.id));

    if (existing && existing.length > 0) {
      await supabase
        .from('apartments')
        .delete()
        .in('id', existing.map((a: any) => a.id));
      console.log(`   ✓ Cleaned ${existing.length} existing test records`);
    }

    // 2. Insert test data
    console.log('\n📝 Inserting test data...');
    const { error: insertError } = await supabase
      .from('apartments')
      .insert(TEST_APARTMENTS.map(apt => ({
        ...apt,
        created_at: new Date().toISOString(),
        room_count: 2,
        monthly_rent_huf: 150000,
        status: 'published',
      })));

    if (insertError) {
      console.error('   ✗ Failed to insert test data:', insertError);
      return;
    }
    console.log(`   ✓ Inserted ${TEST_APARTMENTS.length} test apartments`);

    // 3. Test Case 1: Exact duplicate detection
    console.log('\n🔍 Test 1: Exact Duplicate Detection');
    console.log('   Comparing apt-1 (original) vs apt-2 (exact duplicate)');
    const result1 = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('test-apt-1', 'incremental');
    const match1 = result1.matches.find(m => m.candidateId === 'test-apt-2');

    if (match1) {
      console.log(`   ✓ Duplicate detected!`);
      console.log(`      Total Score: ${(match1.totalScore * 100).toFixed(1)}%`);
      console.log(`      Confidence: ${match1.confidence}`);
      console.log(`      Address Score: ${(match1.scoreBreakdown.addressScore * 100).toFixed(1)}%`);
      console.log(`      Title Score: ${(match1.scoreBreakdown.titleScore * 100).toFixed(1)}%`);
      console.log(`      Geo Score: ${(match1.scoreBreakdown.geoScore * 100).toFixed(1)}%`);

      if (match1.confidence === 'high' && match1.totalScore >= 0.85) {
        console.log(`   ✅ PASS: Exact duplicate correctly identified as HIGH confidence`);
      } else {
        console.log(`   ⚠️  WARNING: Exact duplicate not marked as HIGH confidence`);
      }
    } else {
      console.log(`   ✗ FAIL: Duplicate not detected!`);
    }

    // 4. Test Case 2: Same building detection
    console.log('\n🏢 Test 2: Same Building Detection');
    console.log('   Comparing apt-1 vs apt-3 (different unit, same address)');
    const result2 = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('test-apt-1', 'incremental');
    const match2 = result2.matches.find(m => m.candidateId === 'test-apt-3');

    if (match2) {
      console.log(`   ✓ Match detected!`);
      console.log(`      Total Score: ${(match2.totalScore * 100).toFixed(1)}%`);
      console.log(`      Confidence: ${match2.confidence}`);
      console.log(`      Geo Score: ${(match2.scoreBreakdown.geoScore * 100).toFixed(1)}%`);

      if (['high', 'medium'].includes(match2.confidence)) {
        console.log(`   ✅ PASS: Same building correctly identified`);
      } else {
        console.log(`   ⚠️  WARNING: Same building not identified with confidence`);
      }
    } else {
      console.log(`   ✗ FAIL: Same building match not detected!`);
    }

    // 5. Test Case 3: No match for different apartment
    console.log('\n❌ Test 3: Different Apartment (Should Not Match)');
    console.log('   Comparing apt-1 vs apt-4 (completely different)');
    const result3 = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('test-apt-1', 'incremental');
    const match3 = result3.matches.find(m => m.candidateId === 'test-apt-4');

    if (!match3) {
      console.log(`   ✓ Correctly identified as different apartment`);
      console.log(`   ✅ PASS: No false positive for unrelated apartment`);
    } else {
      console.log(`   ✗ FAIL: False positive - incorrectly matched different apartment`);
      console.log(`      Score: ${(match3.totalScore * 100).toFixed(1)}%`);
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log(`   Total Matches Found: ${result1.matches.length}`);
    console.log(`   Detection Method: ${result1.detectionMethod}`);
    console.log(`   Highest Score: ${(result1.highestMatchScore * 100).toFixed(1)}%`);

    // 7. Cleanup
    console.log('\n🧹 Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('apartments')
      .delete()
      .in('id', TEST_APARTMENTS.map(a => a.id));

    if (deleteError) {
      console.error('   ✗ Cleanup failed:', deleteError);
    } else {
      console.log('   ✓ Test data cleaned up');
    }

    console.log('\n✅ Test suite completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
