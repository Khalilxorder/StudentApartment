import fs from 'fs';
import path from 'path';

async function test() {
  const sample = path.join(process.cwd(), 'public', 'test-image.jpg');
  if (!fs.existsSync(sample)) {
    console.log('No sample image found at', sample);
    console.log('Place a test image at public/test-image.jpg and run this test against a running dev server');
    process.exit(0);
  }

  const buffer = await fs.promises.readFile(sample);
  const base64 = buffer.toString('base64');

  // Attempt to POST to local dev server
  try {
    // Use global fetch (Node 18+ or with --experimental-fetch)
    const res = await (globalThis as any).fetch('http://localhost:3000/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, filename: 'test-image.jpg' }),
    });

    const json = await res.json();
    console.log('Response from API:', json);
  } catch (err) {
    console.error('Failed to call API (is dev server running?):', err);
  }
}

test();
