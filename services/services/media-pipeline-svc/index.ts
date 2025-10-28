// Media Pipeline Service for Student Apartments
// Handles image processing, optimization, and storage
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

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
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Process and upload apartment media
   */
  async processApartmentMedia(
    file: Buffer,
    apartmentId: string,
    filename: string,
    options: MediaProcessingOptions = {}
  ): Promise<ProcessedMedia> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'webp',
      generateBlurhash = true,
      generateThumbnail = true,
    } = options;

    try {
      // Generate unique filename
      const fileId = uuidv4();
      const fileExt = path.extname(filename);
      const baseName = path.basename(filename, fileExt);

      // Process original image metadata
      const metadata = await sharp(file).metadata();

      // Optimize main image
      const optimizedBuffer = await sharp(file)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      // Upload optimized image
      const optimizedPath = `apartments/${apartmentId}/${fileId}_optimized.webp`;
      const { data: optimizedUpload, error: optimizedError } = await this.supabase.storage
        .from('apartment-media')
        .upload(optimizedPath, optimizedBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000', // 1 year
        });

      if (optimizedError) throw optimizedError;

      // Generate thumbnail if requested
      let thumbnailUrl: string | undefined;
      if (generateThumbnail) {
        const thumbnailBuffer = await sharp(file)
          .resize(400, 300, { fit: 'cover' })
          .webp({ quality: 80 })
          .toBuffer();

        const thumbnailPath = `apartments/${apartmentId}/${fileId}_thumb.webp`;
        const { data: thumbUpload, error: thumbError } = await this.supabase.storage
          .from('apartment-media')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
          });

        if (!thumbError) {
          thumbnailUrl = this.supabase.storage
            .from('apartment-media')
            .getPublicUrl(thumbnailPath).data.publicUrl;
        }
      }

      // Generate blurhash if requested
      let blurhash: string | undefined;
      if (generateBlurhash) {
        const { default: blurhashLib } = await import('blurhash');
        const smallBuffer = await sharp(file)
          .resize(32, 32, { fit: 'cover' })
          .raw()
          .toBuffer();

        blurhash = blurhashLib.encode(
          new Uint8ClampedArray(smallBuffer),
          32, 32, 4, 4
        );
      }

      // Get public URLs
      const { data: optimizedPublicUrl } = this.supabase.storage
        .from('apartment-media')
        .getPublicUrl(optimizedPath);

      // Store media record in database
      const { data: mediaRecord, error: dbError } = await this.supabase
        .from('apartment_media')
        .insert({
          apartment_id: apartmentId,
          file_url: optimizedPublicUrl.publicUrl,
          thumbnail_url: thumbnailUrl,
          blurhash,
          file_size: optimizedBuffer.length,
          mime_type: 'image/webp',
          width: metadata.width,
          height: metadata.height,
          is_primary: false, // Will be set by calling code
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        originalUrl: optimizedPublicUrl.publicUrl,
        optimizedUrl: optimizedPublicUrl.publicUrl,
        thumbnailUrl,
        blurhash,
        metadata: {
          width: metadata.width!,
          height: metadata.height!,
          size: optimizedBuffer.length,
          format: 'webp',
        },
      };

    } catch (error) {
      console.error('Media processing error:', error);
      throw new Error(`Failed to process media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multiple apartment images in batch
   */
  async processApartmentMediaBatch(
    files: Array<{ buffer: Buffer; filename: string }>,
    apartmentId: string,
    options: MediaProcessingOptions = {}
  ): Promise<ProcessedMedia[]> {
    const results: ProcessedMedia[] = [];

    for (const file of files) {
      try {
        const processed = await this.processApartmentMedia(
          file.buffer,
          apartmentId,
          file.filename,
          options
        );
        results.push(processed);
      } catch (error) {
        console.error(`Failed to process ${file.filename}:`, error);
        // Continue processing other files
      }
    }

    return results;
  }

  /**
   * Delete apartment media
   */
  async deleteApartmentMedia(mediaId: string, apartmentId: string): Promise<void> {
    try {
      // Get media record
      const { data: media, error: fetchError } = await this.supabase
        .from('apartment_media')
        .select('file_url, thumbnail_url')
        .eq('id', mediaId)
        .eq('apartment_id', apartmentId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file paths from URLs
      const urlParts = media.file_url.split('/');
      const filePath = urlParts.slice(-3).join('/'); // apartments/{id}/{filename}

      // Delete from storage
      await this.supabase.storage
        .from('apartment-media')
        .remove([filePath]);

      if (media.thumbnail_url) {
        const thumbParts = media.thumbnail_url.split('/');
        const thumbPath = thumbParts.slice(-3).join('/');
        await this.supabase.storage
          .from('apartment-media')
          .remove([thumbPath]);
      }

      // Delete from database
      const { error: deleteError } = await this.supabase
        .from('apartment_media')
        .delete()
        .eq('id', mediaId);

      if (deleteError) throw deleteError;

    } catch (error) {
      console.error('Media deletion error:', error);
      throw new Error(`Failed to delete media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set primary image for apartment
   */
  async setPrimaryImage(apartmentId: string, mediaId: string): Promise<void> {
    try {
      // First, unset all primary flags for this apartment
      await this.supabase
        .from('apartment_media')
        .update({ is_primary: false })
        .eq('apartment_id', apartmentId);

      // Then set the new primary
      const { error } = await this.supabase
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

  /**
   * Process profile/avatar images
   */
  async processProfileImage(
    file: Buffer,
    userId: string,
    filename: string
  ): Promise<ProcessedMedia> {
    try {
      const fileId = uuidv4();

      // Process avatar (square crop)
      const avatarBuffer = await sharp(file)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();

      // Upload avatar
      const avatarPath = `profiles/${userId}/${fileId}_avatar.webp`;
      const { error: uploadError } = await this.supabase.storage
        .from('profile-media')
        .upload(avatarPath, avatarBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrl } = this.supabase.storage
        .from('profile-media')
        .getPublicUrl(avatarPath);

      // Update user profile
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      const metadata = await sharp(file).metadata();

      return {
        originalUrl: publicUrl.publicUrl,
        optimizedUrl: publicUrl.publicUrl,
        metadata: {
          width: 200,
          height: 200,
          size: avatarBuffer.length,
          format: 'webp',
        },
      };

    } catch (error) {
      console.error('Profile image processing error:', error);
      throw new Error(`Failed to process profile image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image analysis for apartment quality scoring
   */
  async analyzeImageQuality(file: Buffer): Promise<{
    brightness: number;
    contrast: number;
    sharpness: number;
    quality_score: number;
  }> {
    try {
      const metadata = await sharp(file).metadata();
      const stats = await sharp(file).stats();

      // Calculate brightness (0-255 average)
      const brightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;

      // Calculate contrast (standard deviation)
      const contrast = Math.sqrt(
        (stats.channels[0].stdev ** 2 + stats.channels[1].stdev ** 2 + stats.channels[2].stdev ** 2) / 3
      );

      // Estimate sharpness using Laplacian variance
      const laplacian = await sharp(file)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .stats();

      const sharpness = laplacian.channels[0].mean;

      // Calculate overall quality score (0-100)
      const quality_score = Math.min(100, Math.max(0,
        (brightness / 255) * 30 + // Brightness contribution
        (contrast / 50) * 30 +   // Contrast contribution
        (sharpness / 50) * 40    // Sharpness contribution
      ));

      return {
        brightness: Math.round(brightness),
        contrast: Math.round(contrast),
        sharpness: Math.round(sharpness),
        quality_score: Math.round(quality_score),
      };

    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        brightness: 128,
        contrast: 25,
        sharpness: 25,
        quality_score: 50, // Default neutral score
      };
    }
  }
}

// Export singleton instance
export const mediaPipelineService = new MediaPipelineService();