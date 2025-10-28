import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { mediaService } from '../services/media-svc/index';

async function main() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('No uploads directory found at', uploadsDir);
    process.exit(0);
  }

  const files = glob.sync('**/*.{jpg,jpeg,png}', { cwd: uploadsDir, absolute: true });
  if (files.length === 0) {
    console.log('No images to process in', uploadsDir);
    process.exit(0);
  }

  for (const file of files) {
    try {
      console.log('Processing', file);
      const buffer = fs.readFileSync(file);
      const res = await mediaService.processApartmentImage(buffer, path.basename(file));
      console.log(' ->', res.original, res.optimized);
    } catch (err) {
      console.error('Failed to process', file, err);
    }
  }

  console.log('Done.');
}

if (require.main === module) main().catch(err => { console.error(err); process.exit(1); });
