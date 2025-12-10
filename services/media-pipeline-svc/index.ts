// Media Pipeline Service for Student Apartments
// NOTE: This service is disabled in Vercel serverless environment
// because it requires 'sharp' which is a native Node.js module.
// To use this service, deploy to a Node.js server environment.

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface MediaProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  generateBlurhash?: boolean;
  generateThumbnail?: boolean;
}

export interface ProcessedMedia {
  originalUrl: string;
  optimizedUrl: string;
  thumbnailUrl?: string;
  blurhash?: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

export class MediaPipelineService {
  private _supabase: any = null;

  private getSupabase(): any {
    if (!this._supabase) {
      this._supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return this._supabase;
  }

  constructor() {
    // Lazy initialize - don't access process.env at module load time
  }

  /**
   * Process and upload apartment media
   * NOTE: Disabled in serverless - requires sharp
   */
  async processApartmentMedia(
    file: Buffer,
    apartmentId: string,
    filename: string,
    options: MediaProcessingOptions = {}
  ): Promise<ProcessedMedia> {
    throw new Error('MediaPipelineService is disabled in serverless environment. Sharp is required.');
  }

  async processApartmentMediaBatch(
    files: Array<{ buffer: Buffer; filename: string }>,
    apartmentId: string,
    options: MediaProcessingOptions = {}
  ): Promise<ProcessedMedia[]> {
    throw new Error('MediaPipelineService is disabled in serverless environment. Sharp is required.');
  }

  async deleteApartmentMedia(mediaId: string, apartmentId: string): Promise<void> {
    // This can still work - it's just deleting from storage
    try {
      const { data: media, error: fetchError } = await this.getSupabase()
        .from('apartment_media')
        .select('file_url, thumbnail_url')
        .eq('id', mediaId)
        .eq('apartment_id', apartmentId)
        .single();

      if (fetchError) throw fetchError;

      const urlParts = media.file_url.split('/');
      const filePath = urlParts.slice(-3).join('/');

      await this.getSupabase().storage
        .from('apartment-media')
        .remove([filePath]);

      if (media.thumbnail_url) {
        const thumbParts = media.thumbnail_url.split('/');
        const thumbPath = thumbParts.slice(-3).join('/');
        await this.getSupabase().storage
          .from('apartment-media')
          .remove([thumbPath]);
      }

      const { error: deleteError } = await this.getSupabase()
        .from('apartment_media')
        .delete()
        .eq('id', mediaId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Media deletion error:', error);
      throw new Error(`Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setPrimaryImage(apartmentId: string, mediaId: string): Promise<void> {
    try {
      await this.getSupabase()
        .from('apartment_media')
        .update({ is_primary: false })
        .eq('apartment_id', apartmentId);

      const { error } = await this.getSupabase()
        .from('apartment_media')
        .update({ is_primary: true })
        .eq('id', mediaId)
        .eq('apartment_id', apartmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Set primary image error:', error);
      throw new Error(`Failed to set primary image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processProfileImage(
    file: Buffer,
    userId: string,
    filename: string
  ): Promise<ProcessedMedia> {
    throw new Error('MediaPipelineService is disabled in serverless environment. Sharp is required.');
  }

  async analyzeImageQuality(file: Buffer): Promise<{
    brightness: number;
    contrast: number;
    sharpness: number;
    quality_score: number;
  }> {
    // Return default values since sharp is not available
    return {
      brightness: 128,
      contrast: 25,
      sharpness: 25,
      quality_score: 50,
    };
  }
}

// Export singleton instance
export const mediaPipelineService = new MediaPipelineService();