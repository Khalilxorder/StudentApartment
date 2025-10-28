async function testRankingAPI() {
  console.log('🧪 Testing Ranking API...\n');

  const testData = {
    searchResults: [
      {
        apartment: {
          id: '1',
          title: 'Modern Studio Near ELTE',
          price: 120000,
          rooms: 1,
          location: { lat: 47.4979, lng: 19.0402 },
          address: 'Pázmány Péter sétány 1',
          district: 'Lipótváros',
          amenities: ['WiFi', 'Furnished'],
          photos: ['photo1.jpg'],
          owner: { name: 'John Doe', verified: true }
        },
        score: 0.8,
        reasons: ['Good location']
      },
      {
        apartment: {
          id: '2',
          title: 'Spacious 2BR Apartment',
          price: 180000,
          rooms: 2,
          location: { lat: 47.5, lng: 19.05 },
          address: 'Arany János utca 10',
          district: 'Erzsébetváros',
          amenities: ['WiFi', 'Parking', 'Balcony'],
          photos: ['photo1.jpg', 'photo2.jpg'],
          owner: { name: 'Jane Smith', verified: false }
        },
        score: 0.7,
        reasons: ['More amenities']
      }
    ],
    userPreferences: {
      budget: { min: 100000, max: 200000 },
      rooms: 1,
      commuteMax: 30,
      university: 'ELTE',
      mustHaves: ['WiFi'],
      personality: { quiet: 0.7, social: 0.3 }
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/ranking/rank-apartments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('1️⃣ Testing API Response...');
    if (result.success) {
      console.log('   ✅ API returned success');
    } else {
      throw new Error('API returned failure');
    }

    console.log('2️⃣ Testing Ranked Results...');
    const { results, rankingStats } = result.data;

    if (results && Array.isArray(results)) {
      console.log(`   ✅ Returned ${results.length} ranked results`);
    } else {
      throw new Error('No results array returned');
    }

    console.log('3️⃣ Validating Ranking Scores...');
    const hasValidScores = results.every((r: any) =>
      typeof r.finalScore === 'number' &&
      r.finalScore >= 0 && r.finalScore <= 1 &&
      typeof r.rankingScore === 'number'
    );

    if (hasValidScores) {
      console.log('   ✅ All results have valid ranking scores');
    } else {
      console.log('   ❌ Some results missing valid scores');
    }

    console.log('4️⃣ Checking Ranking Components...');
    const hasComponents = results.every((r: any) =>
      r.rankingComponents &&
      typeof r.rankingComponents.constraintFit === 'number'
    );

    if (hasComponents) {
      console.log('   ✅ All results have ranking components');
    } else {
      console.log('   ❌ Some results missing ranking components');
    }

    console.log('5️⃣ Validating Ranking Stats...');
    if (rankingStats &&
        typeof rankingStats.totalResults === 'number' &&
        typeof rankingStats.averageScore === 'number') {
      console.log('   ✅ Ranking stats are valid');
      console.log(`   📊 Average score: ${(rankingStats.averageScore * 100).toFixed(1)}%`);
    } else {
      console.log('   ❌ Ranking stats missing or invalid');
    }

    console.log('\n🎉 Ranking API tests passed!');

  } catch (error) {
    console.error('❌ Ranking API test failed:', error);
    console.log('\n💡 Make sure the Next.js development server is running: npm run dev');
  }
}

// Run the test
testRankingAPI();