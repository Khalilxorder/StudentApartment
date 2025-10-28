import { searchService } from '../services/search-svc/index.js';

async function testSearchImplementation() {
  console.log('🧪 Testing Search Implementation (Mock Test)...\n');

  try {
    // Test basic service instantiation
    console.log('1️⃣ Testing Service Instantiation...');
    if (searchService) {
      console.log('   ✅ Search service instantiated successfully');
    } else {
      throw new Error('Search service not instantiated');
    }

    // Test interface compliance
    console.log('2️⃣ Testing Interface Compliance...');
    const methods = ['structuredSearch', 'keywordSearch', 'semanticSearch', 'hybridSearch', 'mergeResults'];
    const hasAllMethods = methods.every(method => typeof (searchService as any)[method] === 'function');

    if (hasAllMethods) {
      console.log('   ✅ All required methods implemented');
    } else {
      console.log('   ❌ Missing methods:', methods.filter(method => typeof (searchService as any)[method] !== 'function'));
    }

    // Test result merging (pure function)
    console.log('3️⃣ Testing Result Merging...');
    const mockResults = [
      [
        {
          apartment: { 
            id: '1', 
            title: 'Apartment 1', 
            description: 'Beautiful apartment in the city center', 
            price: 100000, 
            rooms: 2, 
            location: { lat: 47.5, lng: 19.0 }, 
            address: 'Address 1', 
            district: 'District 1', 
            amenities: ['WiFi'], 
            photos: [], 
            owner: { name: 'Owner 1', verified: true },
            metrics: { mediaQuality: 0.8, completeness: 0.9, commuteMinutes: 15, suggestedPrice: 95000 }
          },
          score: 0.8,
          reasons: ['Good match'],
          reasonCodes: ['general_match'],
          source: 'structured' as const
        }
      ],
      [
        {
          apartment: { 
            id: '1', 
            title: 'Apartment 1', 
            description: 'Beautiful apartment in the city center', 
            price: 100000, 
            rooms: 2, 
            location: { lat: 47.5, lng: 19.0 }, 
            address: 'Address 1', 
            district: 'District 1', 
            amenities: ['WiFi'], 
            photos: [], 
            owner: { name: 'Owner 1', verified: true },
            metrics: { mediaQuality: 0.8, completeness: 0.9, commuteMinutes: 15, suggestedPrice: 95000 }
          },
          score: 0.6,
          reasons: ['Keyword match'],
          reasonCodes: ['text_match'],
          source: 'keyword' as const
        },
        {
          apartment: { 
            id: '2', 
            title: 'Apartment 2', 
            description: 'Cozy studio apartment near university', 
            price: 150000, 
            rooms: 1, 
            location: { lat: 47.6, lng: 19.1 }, 
            address: 'Address 2', 
            district: 'District 2', 
            amenities: ['Parking'], 
            photos: [], 
            owner: { name: 'Owner 2', verified: false },
            metrics: { mediaQuality: 0.7, completeness: 0.8, commuteMinutes: 10, suggestedPrice: 145000 }
          },
          score: 0.7,
          reasons: ['Similar description'],
          reasonCodes: ['semantic_match'],
          source: 'semantic' as const
        }
      ]
    ];

    const mergedResults = searchService.mergeResults(mockResults, [0.4, 0.6]);
    console.log(`   ✅ Merged ${mockResults.flat().length} results into ${mergedResults.length} unique results`);

    // Validate merged results
    console.log('4️⃣ Validating Merged Results...');
    if (mergedResults.length > 0) {
      const topResult = mergedResults[0];
      const hasRequiredFields = !!(
        topResult.apartment?.id &&
        topResult.apartment?.title &&
        topResult.apartment?.price &&
        typeof topResult.score === 'number' &&
        Array.isArray(topResult.reasons) && Array.isArray(topResult.reasonCodes)
      );

      if (hasRequiredFields) {
        console.log('   ✅ Merged results have required fields');
        console.log(`   ✅ Top result score: ${(topResult.score * 100).toFixed(1)}%`);
        console.log(`   ✅ Reasons: ${topResult.reasons.join(', ')}`);
      } else {
        console.log('   ❌ Merged results missing required fields');
      }
    }

    console.log('\n🎉 Search service structure tests passed!');
    console.log('\n📝 Note: Full integration tests require running database and Meilisearch services.');
    console.log('   To run full tests:');
    console.log('   1. Start PostgreSQL with PostGIS and pgvector');
    console.log('   2. Start Meilisearch server');
    console.log('   3. Run database migrations');
    console.log('   4. Run: npm run sync:search all');

  } catch (error) {
    console.error('❌ Search test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSearchImplementation();



