import { NextRequest, NextResponse } from 'next/server';

// Media Service - Image uploads without native module processing
// Handles apartment photos, user avatars, and document uploads
// NOTE: Image processing (sharp) disabled for Vercel serverless deployment

import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface MediaConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  formats: string[];
}

interface ProcessedMedia {
  original: string;
  thumbnail: string;
  optimized: string;
  blurhash: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
    quality: number;
  };
}

interface MediaAnalysis {
  isValid: boolean;
  quality: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  tags: string[];
  warnings: string[];
}

class MediaService {
  private config: MediaConfig = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85,
    formats: ['webp', 'jpeg', 'png'],
  };

  async processApartmentImage(buffer: Buffer, filename: string): Promise<ProcessedMedia> {
    const hash = this.generateHash(buffer);
    const basePath = `apartments/${hash}`;
    const ext = this.getExtension(filename);

    // Save original without processing (sharp disabled for Vercel)
    const original = await this.saveBuffer(buffer, `${basePath}/original.${ext}`);

    // Use same URL for all variants (no processing)
    return {
      original,
      thumbnail: original,
      optimized: original,
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj', // Default blurhash
      metadata: {
        width: 0,
        height: 0,
        size: buffer.length,
        format: ext,
        quality: this.config.quality,
      },
    };
  }

  async processUserAvatar(buffer: Buffer, userId: string): Promise<ProcessedMedia> {
    const hash = this.generateHash(buffer);
    const avatarPath = `avatars/${userId}/${hash}_avatar.webp`;

    // Save without processing (sharp disabled for Vercel)
    const original = await this.saveBufferToBucket(buffer, avatarPath, 'apartments');

    return {
      original,
      thumbnail: original,
      optimized: original,
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
      metadata: {
        width: 0,
        height: 0,
        size: buffer.length,
        format: 'webp',
        quality: this.config.quality,
      },
    };
  }

  async processDocument(buffer: Buffer, userId: string, type: string): Promise<string> {
    const hash = this.generateHash(buffer);
    const path = `documents/${userId}/${type}/${hash}.pdf`;
    return this.saveBuffer(buffer, path);
  }

  async analyzeImage(_buffer: Buffer): Promise<MediaAnalysis> {
    // Image analysis disabled (requires sharp)
    // Return default valid analysis
    return {
      isValid: true,
      quality: 0.8,
      brightness: 0.5,
      contrast: 0.5,
      sharpness: 0.5,
      tags: ['uploaded'],
      warnings: [],
    };
  }

  private getExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      return ext === 'jpg' ? 'jpeg' : ext;
    }
    return 'jpeg';
  }

  private generateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
  }

  private async saveBuffer(buffer: Buffer, path: string): Promise<string> {
    return this.saveBufferToBucket(buffer, path, 'apartments');
  }

  private async saveBufferToBucket(buffer: Buffer, path: string, bucket: string): Promise<string> {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const contentType = path.endsWith('.pdf') ? 'application/pdf' :
      path.endsWith('.webp') ? 'image/webp' :
        path.endsWith('.png') ? 'image/png' : 'image/jpeg';

    logger.info(`Uploading to bucket: ${bucket}, path: ${path}`);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      logger.error({ err: error, bucket, path }, 'Storage upload failed');
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async getApartmentPhotoCount(apartmentId: string): Promise<number> {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { count, error } = await supabase
        .from('apartment_media')
        .select('*', { count: 'exact', head: true })
        .eq('apartment_id', apartmentId);

      if (error) {
        logger.error({ err: error }, 'Error counting apartment photos');
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get apartment photo count');
      return 0;
    }
  }
}

const mediaService = new MediaService();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const userId = formData.get('userId') as string | null;
    const apartmentId = formData.get('apartmentId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'Type required (apartment, avatar, document)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = await mediaService.analyzeImage(buffer);

    let result: any;

    switch (type) {
      case 'apartment':
        if (apartmentId) {
          const existingPhotos = await mediaService.getApartmentPhotoCount(apartmentId);
          if (existingPhotos >= 20) {
            return NextResponse.json({
              error: 'Maximum 20 photos allowed per apartment',
              currentCount: existingPhotos
            }, { status: 400 });
          }
        }
        result = await mediaService.processApartmentImage(buffer, file.name);
        break;

      case 'avatar':
        if (!userId) {
          return NextResponse.json({ error: 'userId required for avatars' }, { status: 400 });
        }
        result = await mediaService.processUserAvatar(buffer, userId);
        break;

      case 'document':
        if (!userId) {
          return NextResponse.json({ error: 'userId required for documents' }, { status: 400 });
        }
        const docType = formData.get('docType') as string;
        if (!docType) {
          return NextResponse.json({ error: 'docType required for documents' }, { status: 400 });
        }
        const isPdf = buffer.lastIndexOf('%PDF-') === 0 ||
          (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);
        if (!isPdf && file.type !== 'application/pdf') {
          return NextResponse.json({ error: 'Invalid document format. Only PDF allowed.' }, { status: 400 });
        }
        result = await mediaService.processDocument(buffer, userId, docType);
        break;

      default:
        return NextResponse.json({ error: 'Invalid type. Use: apartment, avatar, document' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url: result.optimized || result,
      data: {
        ...result,
        analysis,
      },
    });

  } catch (error: unknown) {
    logger.error({ error, details: error instanceof Error ? error.message : 'Unknown' }, 'Media upload error');
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = await mediaService.analyzeImage(buffer);

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error: unknown) {
    logger.error({ err: error }, 'Media analysis error');
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
