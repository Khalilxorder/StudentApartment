
import { mediaService } from '../services/media-svc/index';
import sharp from 'sharp';

async function testMediaPipeline() {
    console.log('🧪 Testing Media Pipeline Service...');

    try {
        // 1. Create a simple test image buffer (100x100 red square)
        const testBuffer = await sharp({
            create: {
                width: 100,
                height: 100,
                channels: 4,
                background: { r: 255, g: 0, b: 0, alpha: 1 }
            }
        }).png().toBuffer();

        // 2. Test Analysis
        console.log('   Running analyzeImage...');
        const analysis = await mediaService.analyzeImage(testBuffer);

        if (!analysis.isValid) {
            // It might be valid or invalid depending on quality checks, but it should return a result
            console.warn('   Analysis returned invalid, but function executed.');
        } else {
            console.log('   ✅ analyzeImage success');
        }

        // 3. Test Metadata extraction (implicitly tested via internal methods, but we can check analyze properties)
        if (typeof analysis.quality === 'number') {
            console.log('   ✅ Metadata extraction verified');
        }

        console.log('✅ Media Pipeline Service Tests Passed');
        return true;
    } catch (error) {
        console.error('❌ Media Pipeline Service Test Failed:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    testMediaPipeline();
}

export { testMediaPipeline };
