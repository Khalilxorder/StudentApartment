
import { testMediaPipeline } from './test-media-pipeline';
import { testCommuteService } from './test-commute-service';

async function runCompleteSuite() {
    console.log('🚀 Starting Complete Test Suite...');
    const startTime = Date.now();
    let passed = 0;
    let total = 0;

    try {
        // Include specific sub-suites here

        total++;
        await testMediaPipeline();
        passed++;

        total++;
        await testCommuteService();
        passed++;

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✨ Test Suite Completed in ${duration}s`);
        console.log(`📊 Result: ${passed}/${total} Suites Passed`);

        if (passed === total) {
            process.exit(0);
        } else {
            process.exit(1);
        }

    } catch (error) {
        console.error('\n💥 Critical Test Suite Failure:', error);
        process.exit(1);
    }
}

runCompleteSuite();
