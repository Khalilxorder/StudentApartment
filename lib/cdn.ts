/**
 * CDN Integration for optimized image delivery
 * Supports Cloudflare R2, Vercel Blob, and Supabase Storage
 */

interface CDNConfig {
  provider: 'cloudflare' | 'vercel' | 'supabase';
  baseUrl: string;
  accountId?: string;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
}

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

class CDNService {
  private config: CDNConfig;

  constructor() {
    this.config = this.detectProvider();
  }

  /**
   * Detect the best available CDN provider
   */
  private detectProvider(): CDNConfig {
    // Check for Cloudflare R2
    if (process.env.CLOUDFLARE_R2_BUCKET && process.env.CLOUDFLARE_ACCOUNT_ID) {
      return {
        provider: 'cloudflare',
        baseUrl: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        accessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY,
        secretKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
        bucket: process.env.CLOUDFLARE_R2_BUCKET,
      };
    }

    // Check for Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        provider: 'vercel',
        baseUrl: 'https://blob.vercel-storage.com',
      };
    }

    // Fallback to Supabase Storage
    return {
      provider: 'supabase',
      baseUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`,
    };
  }

  /**
   * Get optimized image URL with transformations
   */
  getImageUrl(path: string, options: ImageTransformOptions = {}): string {
    const {
      width,
      height,
      quality = 85,
      format = 'webp',
      fit = 'cover',
    } = options;

    switch (this.config.provider) {
      case 'cloudflare':
        return this.getCloudflareUrl(path, { width, height, quality, format, fit });
      
      case 'vercel':
        return this.getVercelUrl(path, { width, height, quality, format });
      
      case 'supabase':
      default:
        return this.getSupabaseUrl(path, { width, height, quality });
    }
  }

  /**
   * Cloudflare Images URL with transformations
   */
  private getCloudflareUrl(path: string, options: ImageTransformOptions): string {
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format) params.append('format', options.format);
    if (options.fit) params.append('fit', options.fit);

    const queryString = params.toString();
    const baseUrl = `${this.config.baseUrl}/${this.config.bucket}/${path}`;
    
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Vercel Image Optimization URL
   */
  private getVercelUrl(path: string, options: ImageTransformOptions): string {
    // Vercel uses the /_next/image endpoint for optimization
    const params = new URLSearchParams();
    
    params.append('url', encodeURIComponent(path));
    if (options.width) params.append('w', options.width.toString());
    if (options.quality) params.append('q', options.quality.toString());

    return `/_next/image?${params.toString()}`;
  }

  /**
   * Supabase Storage URL with basic transformations
   */
  private getSupabaseUrl(path: string, options: ImageTransformOptions): string {
    // Supabase Storage supports basic transformations
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());

    const queryString = params.toString();
    const baseUrl = `${this.config.baseUrl}/apartments/${path}`;
    
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Get responsive srcset for an image
   */
  getResponsiveSrcSet(path: string, widths: number[] = [640, 750, 828, 1080, 1200]): string {
    return widths
      .map(width => `${this.getImageUrl(path, { width })} ${width}w`)
      .join(', ');
  }

  /**
   * Preload critical images
   */
  getPreloadTag(path: string, options: ImageTransformOptions = {}): string {
    const url = this.getImageUrl(path, options);
    return `<link rel="preload" as="image" href="${url}" />`;
  }

  /**
   * Upload image to CDN
   */
  async uploadImage(file: File, path: string): Promise<string> {
    // Implementation depends on provider
    // For now, return the expected URL
    return this.getImageUrl(path);
  }

  /**
   * Delete image from CDN
   */
  async deleteImage(path: string): Promise<void> {
    // Implementation depends on provider
    console.log(`Deleting image: ${path}`);
  }

  /**
   * Get CDN stats
   */
  getStats(): {
    provider: string;
    baseUrl: string;
  } {
    return {
      provider: this.config.provider,
      baseUrl: this.config.baseUrl,
    };
  }
}

// Singleton instance
export const cdn = new CDNService();

// Helper function to generate image srcset
export function getImageSrcSet(path: string, sizes?: number[]): {
  src: string;
  srcSet: string;
  sizes: string;
} {
  const defaultSizes = [640, 750, 828, 1080, 1200, 1920];
  const widths = sizes || defaultSizes;

  return {
    src: cdn.getImageUrl(path, { width: 1080 }),
    srcSet: cdn.getResponsiveSrcSet(path, widths),
    sizes: '(max-width: 640px) 640px, (max-width: 1080px) 1080px, 1920px',
  };
}

// Helper to optimize image for thumbnail
export function getThumbnailUrl(path: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const dimensions = {
    small: { width: 200, height: 200 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 },
  };

  return cdn.getImageUrl(path, {
    ...dimensions[size],
    fit: 'cover',
    quality: 85,
  });
}
