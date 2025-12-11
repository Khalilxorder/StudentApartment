// Media Service - Image processing and optimization pipeline
// Handles apartment photos, user avatars, and document uploads
// NOTE: Sharp removed for Vercel serverless compatibility

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
    const ext = this.getExtension(filename);

    // Save original without processing (sharp disabled)
    const original = await this.saveBuffer(buffer, `${basePath}/original.${ext}`);

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
    const basePath = `users/${userId}/${hash}`;

    const original = await this.saveBuffer(buffer, `${basePath}/avatar.webp`);

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
    if (!this.storageClient) {
      return `https://static-placeholder.local/${path}`;
    }

    const contentType = path.endsWith('.pdf') ? 'application/pdf' :
      path.endsWith('.webp') ? 'image/webp' :
        path.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const { data, error } = await this.storageClient.storage
      .from(this.storageBucket)
      .upload(path, buffer, {
        contentType,
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
}

export const mediaService = new MediaService();
