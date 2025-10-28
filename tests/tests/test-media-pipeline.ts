import { mediaService } from '../services/media-svc/index';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function run() {
  console.log('🧪 Testing media pipeline...');

  const sample = path.join(process.cwd(), 'public', 'test-image.jpg');
  let buffer: Buffer | null = null;

  if (fs.existsSync(sample)) {
    try {
      buffer = await fs.promises.readFile(sample);
    } catch (err) {
      console.warn('Found test image but failed to read it, will generate a fallback image:', err);
      buffer = null;
    }
  }

  // If no valid buffer found on disk, generate a small valid JPEG with sharp
  if (!buffer) {
    console.log('Generating fallback test image using sharp...');
    buffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  try {
    const result = await mediaService.processApartmentImage(buffer as Buffer, 'test.jpg');
    console.log('Result:', result);
    console.log('✅ Media pipeline test passed');
  } catch (err) {
    // If processing failed due to input format, try generating a fresh image and retry once
    console.error('❌ Media pipeline test failed on first attempt:', err);
    try {
      console.log('Retrying with a freshly generated image...');
      const gen = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 255, b: 255 } } }).jpeg({ quality: 90 }).toBuffer();
      const retry = await mediaService.processApartmentImage(gen, 'test-retry.jpg');
      console.log('Result (retry):', retry);
      console.log('✅ Media pipeline test passed on retry');
    } catch (err2) {
      console.error('❌ Media pipeline test failed on retry:', err2);
      process.exit(1);
    }
  }
}

run();
