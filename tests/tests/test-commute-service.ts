import { commuteService } from '@/services/commute-svc/index';

async function test() {
  console.log('🧪 Testing enhanced commute service...');

  const apartment = { lat: 47.4979, lng: 19.0402 }; // Central Budapest (Deák Ferenc tér)

  console.log('\n📍 Testing single commute calculations...');

  // Test different modes
  const modes = ['walking', 'bicycling', 'transit', 'driving'] as const;
  for (const mode of modes) {
    try {
      const result = await commuteService.calculateCommute(apartment, 'elte', mode);
      if (result) {
        console.log(`  ${mode}: ${result.travelTime} min (${result.distance}m)`);
        if (result.route) {
          console.log(`    Route: ${result.route.steps?.[0] || 'No steps'}`);
        }
      } else {
        console.log(`  ${mode}: Failed to calculate`);
      }
    } catch (error) {
      console.log(`  ${mode}: Error - ${error}`);
    }
  }

  console.log('\n🏫 Testing all commutes for apartment...');
  const results = await commuteService.calculateAllCommutes(apartment, 'apt-1');

  console.log('All commute results:');
  for (const r of results) {
    console.log(` - ${r.universityId}: ${r.travelTime} min (${r.distance}m) via ${r.mode}${r.realTime ? ' (real-time)' : ''}`);
  }

  console.log('\n🏛️ Available universities:');
  const universities = commuteService.getUniversities();
  universities.forEach(u => {
    console.log(` - ${u.id}: ${u.name} (${u.location.lat.toFixed(4)}, ${u.location.lng.toFixed(4)})`);
  });

  console.log('\n✅ Enhanced commute service test complete');
}

test().catch(console.error);
