// Media Service - Image processing and optimization pipeline
// Handles apartment photos, user avatars, and document uploads

import sharp from 'sharp';
import { createHash } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MediaConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  formats: string[];
}

export interface ProcessedMedia {
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

export interface MediaAnalysis {
  isValid: boolean;
  quality: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  tags: string[];
  warnings: string[];
}

export class MediaService {
  private config: MediaConfig = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85,
    formats: ['webp', 'jpeg', 'png'],
  };
  private storageClient: SupabaseClient | null;
  private storageBucket: string;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    this.storageBucket = process.env.MEDIA_BUCKET || 'apartment-media';
    this.storageClient = supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        })
      : null;
  }

  async processApartmentImage(buffer: Buffer, filename: string): Promise<ProcessedMedia> {
    const hash = this.generateHash(buffer);
    const basePath = `apartments/${hash}`;

    // Process original
    const original = await this.saveOriginal(buffer, `${basePath}/original.webp`);

    // Create thumbnail
    const thumbnail = await this.createThumbnail(buffer, `${basePath}/thumb.webp`);

    // Create optimized version
    const optimized = await this.createOptimized(buffer, `${basePath}/optimized.webp`);

    // Generate blurhash
    const blurhash = await this.generateBlurhash(buffer);

    // Extract metadata
    const metadata = await this.extractMetadata(buffer);

    return {
      original,
      thumbnail,
      optimized,
      blurhash,
      metadata,
    };
  }

  async processUserAvatar(buffer: Buffer, userId: string): Promise<ProcessedMedia> {
    const hash = this.generateHash(buffer);
    const basePath = `users/${userId}/${hash}`;

    // Square crop for avatar
    const cropped = await sharp(buffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .webp({ quality: 90 })
      .toBuffer();

    const original = await this.saveBuffer(cropped, `${basePath}/avatar.webp`);
    const thumbnail = await this.createThumbnail(cropped, `${basePath}/thumb.webp`);

    const blurhash = await this.generateBlurhash(cropped);
    const metadata = await this.extractMetadata(cropped);

    return {
      original,
      thumbnail,
      optimized: original, // Same as original for avatars
      blurhash,
      metadata,
    };
  }

  async processDocument(buffer: Buffer, userId: string, type: string): Promise<string> {
    const hash = this.generateHash(buffer);
    const path = `documents/${userId}/${type}/${hash}.pdf`;

    // In production, this would validate PDF structure, extract text, etc.
    return this.saveBuffer(buffer, path);
  }

  async analyzeImage(buffer: Buffer): Promise<MediaAnalysis> {
    try {
      const image = sharp(buffer);
      const { width, height, format } = await image.metadata();

      if (!width || !height) {
        return {
          isValid: false,
          quality: 0,
          brightness: 0,
          contrast: 0,
          sharpness: 0,
          tags: [],
          warnings: ['Invalid image format'],
        };
      }

      // Basic quality checks
      const quality = this.assessQuality(width, height, buffer.length);
      const brightness = await this.calculateBrightness(image);
      const contrast = await this.calculateContrast(image);
      const sharpness = await this.calculateSharpness(image);

      const warnings: string[] = [];
      if (quality < 0.5) warnings.push('Low quality image');
      if (brightness < 0.2) warnings.push('Too dark');
      if (brightness > 0.9) warnings.push('Too bright');
      if (contrast < 0.3) warnings.push('Low contrast');
      if (sharpness < 0.4) warnings.push('Blurry image');

      return {
        isValid: warnings.length === 0,
        quality,
        brightness,
        contrast,
        sharpness,
        tags: this.generateTags(width, height, format as string),
        warnings,
      };
    } catch (error) {
      return {
        isValid: false,
        quality: 0,
        brightness: 0,
        contrast: 0,
        sharpness: 0,
        tags: [],
        warnings: ['Failed to analyze image'],
      };
    }
  }

  private async createThumbnail(buffer: Buffer, path: string): Promise<string> {
    const thumbnail = await sharp(buffer)
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toBuffer();

    return this.saveBuffer(thumbnail, path);
  }

  private async createOptimized(buffer: Buffer, path: string): Promise<string> {
    const optimized = await sharp(buffer)
      .resize(this.config.maxWidth, this.config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: this.config.quality })
      .toBuffer();

    return this.saveBuffer(optimized, path);
  }

  private async generateBlurhash(buffer: Buffer): Promise<string> {
    try {
      // Get image dimensions first
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;

      if (!width || !height) {
        throw new Error('Unable to get image dimensions');
      }

      // Convert to RGBA format and get raw pixel data
      const resizedImage = sharp(buffer)
        .resize(32, 32, { fit: 'fill', withoutEnlargement: true }) // Downsample for blurhash
        .ensureAlpha(); // Ensure RGBA

      const { data } = await resizedImage
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Import blurhash library dynamically to avoid issues
      const { encode } = await import('blurhash');

      // Encode to blurhash (x: 4, y: 3 components for good quality/size balance)
      // Use exact 32x32 dimensions for blurhash
      const blurhash = encode(new Uint8ClampedArray(data), 32, 32, 4, 3);

      return blurhash;
    } catch (error) {
      console.error('Error generating blurhash:', error);
      // Return a fallback blurhash for a neutral gray image
      return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
    }
  }

  private async extractMetadata(buffer: Buffer) {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: buffer.length,
      format: metadata.format || 'unknown',
      quality: this.config.quality,
    };
  }

  private generateHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
  }

  private async saveOriginal(buffer: Buffer, path: string): Promise<string> {
    return this.saveBuffer(buffer, path);
  }

  private async saveBuffer(buffer: Buffer, path: string): Promise<string> {
    if (!this.storageClient) {
      return `https://static-placeholder.local/${path}`;
    }

    const { data, error } = await this.storageClient.storage
      .from(this.storageBucket)
      .upload(path, buffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      console.error('Failed to upload media to storage', error);
      throw error;
    }

    const { data: publicUrl } = this.storageClient.storage
      .from(this.storageBucket)
      .getPublicUrl(data.path);

    return publicUrl.publicUrl;
  }

  private assessQuality(width: number, height: number, size: number): number {
    const pixels = width * height;
    const expectedSize = pixels * 3; // Rough estimate for RGB
    return Math.min(size / expectedSize, 1);
  }

  private async calculateBrightness(image: sharp.Sharp): Promise<number> {
    const stats = await image.stats();
    return (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / (3 * 255);
  }

  private async calculateContrast(image: sharp.Sharp): Promise<number> {
    const stats = await image.stats();
    const means = stats.channels.map(c => c.mean);
    const variances = stats.channels.map((c: any) => c.variance);
    const avgVariance = variances.reduce((a, b) => a + b) / variances.length;
    return Math.min(Math.sqrt(avgVariance) / 128, 1); // Normalize
  }

  private async calculateSharpness(image: sharp.Sharp): Promise<number> {
    // Simple Laplacian variance as sharpness measure
    try {
      const { data } = await image
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const variance = this.calculateVariance(data);
      return Math.min(variance / 1000, 1); // Normalize
    } catch {
      return 0.5;
    }
  }

  private calculateVariance(data: Buffer): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  }

  private generateTags(width: number, height: number, format: string): string[] {
    const tags: string[] = [format];

    if (width > height) tags.push('landscape');
    else if (height > width) tags.push('portrait');
    else tags.push('square');

    if (width >= 2000 || height >= 2000) tags.push('high-res');
    else if (width >= 1000 || height >= 1000) tags.push('medium-res');
    else tags.push('low-res');

    return tags;
  }
}

export const mediaService = new MediaService();
