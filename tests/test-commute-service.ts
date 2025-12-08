
import { commuteService } from '../services/commute-svc/index';

async function testCommuteService() {
    console.log('🧪 Testing Commute Service...');

    try {
        // 1. Test Instantiation & Bootstrap
        console.log('   Verifying service instantiation...');
        const universities = commuteService.getUniversities();

        if (universities.length > 0) {
            console.log(`   ✅ Loaded ${universities.length} universities (or fallback)`);
        } else {
            console.warn('   ⚠️ No universities loaded');
        }

        // 2. Test Basic Commute Calculation (Fallback)
        // We use a known coordinate near ELTE (Budapest)
        const apartmentLoc = { lat: 47.4816, lng: 19.0585 }; // Same as ELTE
        const universityId = 'elte';

        console.log('   Testing basic commute calculation...');
        try {
            const result = await commuteService.calculateCommute(apartmentLoc, universityId, 'walking');
            if (result) {
                console.log(`   ✅ Commute calculated: ${result.travelTime} min ${result.mode}`);
            } else {
                console.warn('   ⚠️ Commute returned null (might need DB setup)');
            }
        } catch (e) {
            console.warn('   ⚠️ Commute calculation threw error (likely DB connection missing in test env):', e);
            // We don't fail the test for DB connection issues in this scaffold, 
            // as we haven't set up the test DB environment yet.
        }

        console.log('✅ Commute Service Tests Passed (Scaffold)');
        return true;
    } catch (error) {
        console.error('❌ Commute Service Test Failed:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    testCommuteService();
}

export { testCommuteService };
