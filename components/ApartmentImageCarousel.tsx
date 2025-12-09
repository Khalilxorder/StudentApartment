'use client';

import { useState } from 'react';

interface ApartmentImageCarouselProps {
    images: string[];
    alt: string;
    heightClass?: string;
    onImageClick?: () => void;
    className?: string;
}

export default function ApartmentImageCarousel({
    images = [],
    alt,
    heightClass = "h-48",
    onImageClick,
    className = ""
}: ApartmentImageCarouselProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const hasMultipleImages = images.length > 1;

    const nextImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div
            className={`relative ${heightClass} bg-gray-200 group overflow-hidden ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onImageClick}
        >
            {/* Main Image */}
            {images.length > 0 ? (
                <img // Using img tag for simplicity and carousel performance, could be Next Image if optimized
                    src={images[currentImageIndex]}
                    alt={alt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-4xl font-semibold">SA</span>
                </div>
            )}

            {/* Carousel Controls */}
            {hasMultipleImages && isHovered && (
                <>
                    <button
                        onClick={prevImage}
                        aria-label="Previous image"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 z-20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                        onClick={nextImage}
                        aria-label="Next image"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 z-20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                        {images.slice(0, 5).map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${currentImageIndex === idx ? 'bg-white' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
