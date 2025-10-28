'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cdn } from '@/lib/cdn';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  blurhash?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 85,
  sizes,
  fill = false,
  objectFit = 'cover',
  blurhash,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Get optimized URL from CDN
  const optimizedSrc = cdn.getImageUrl(src, {
    width: width,
    height: height,
    quality: quality,
    format: 'webp',
  });

  // Fallback image for errors
  const fallbackSrc = '/images/placeholder-apartment.jpg';

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Blurhash or loading placeholder */}
      {isLoading && blurhash && (
        <div
          className="absolute inset-0 bg-gray-200"
          style={{
            backgroundImage: `url(data:image/svg+xml;base64,${btoa(
              `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${blurhash}"/></svg>`
            )})`,
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Main image */}
      {fill ? (
        <Image
          src={hasError ? fallbackSrc : optimizedSrc}
          alt={alt}
          fill
          className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectFit }}
          quality={quality}
          priority={priority}
          sizes={sizes}
          onLoadingComplete={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : (
        <Image
          src={hasError ? fallbackSrc : optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectFit }}
          quality={quality}
          priority={priority}
          sizes={sizes}
          onLoadingComplete={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      )}

      {/* Loading skeleton */}
      {isLoading && !blurhash && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}

// Utility component for apartment thumbnails
export function ApartmentThumbnail({
  src,
  alt,
  size = 'medium',
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  priority?: boolean;
}) {
  const dimensions = {
    small: { width: 200, height: 200 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 },
  };

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      {...dimensions[size]}
      className={className}
      priority={priority}
      objectFit="cover"
    />
  );
}

// Utility component for hero images
export function HeroImage({
  src,
  alt,
  className = '',
  priority = true,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      className={className}
      priority={priority}
      sizes="100vw"
      objectFit="cover"
    />
  );
}
