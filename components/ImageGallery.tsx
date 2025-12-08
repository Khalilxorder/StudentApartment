'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Star, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export interface GalleryImage {
    id: string;
    url: string;
    thumbnailUrl?: string;
    isCover?: boolean;
    status?: 'uploading' | 'processing' | 'complete' | 'error';
    progress?: number;
    error?: string;
}

interface SortableImageProps {
    image: GalleryImage;
    onRemove: (id: string) => void;
    onSetCover: (id: string) => void;
}

function SortableImage({ image, onRemove, onSetCover }: SortableImageProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: image.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    const isUploading = image.status === 'uploading' || image.status === 'processing';
    const hasError = image.status === 'error';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group rounded-lg overflow-hidden bg-gray-100 aspect-square
        ${isDragging ? 'shadow-2xl ring-2 ring-blue-500' : 'shadow-md'}
        ${hasError ? 'ring-2 ring-red-500' : ''}
      `}
        >
            {/* Image */}
            {image.url && (
                <Image
                    src={image.thumbnailUrl || image.url}
                    alt="Gallery image"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 200px"
                />
            )}

            {/* Cover badge */}
            {image.isCover && (
                <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                    <Star className="h-3 w-3 fill-current" />
                    Cover
                </div>
            )}

            {/* Upload progress overlay */}
            {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                    {image.progress !== undefined && (
                        <div className="mt-2 w-3/4">
                            <div className="bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${image.progress}%` }}
                                />
                            </div>
                            <p className="text-white text-xs text-center mt-1">
                                {image.status === 'processing' ? 'Optimizing...' : `${image.progress}%`}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Complete indicator */}
            {image.status === 'complete' && (
                <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle className="h-4 w-4 text-white" />
                </div>
            )}

            {/* Error indicator */}
            {hasError && (
                <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center p-2">
                    <AlertCircle className="h-8 w-8 text-white" />
                    <p className="text-white text-xs text-center mt-1">{image.error || 'Upload failed'}</p>
                </div>
            )}

            {/* Hover controls */}
            {!isUploading && !hasError && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {/* Drag handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-2 bg-white/90 rounded-full hover:bg-white cursor-grab active:cursor-grabbing"
                        aria-label="Drag to reorder"
                    >
                        <GripVertical className="h-5 w-5 text-gray-700" />
                    </button>

                    {/* Set as cover */}
                    {!image.isCover && (
                        <button
                            onClick={() => onSetCover(image.id)}
                            className="p-2 bg-white/90 rounded-full hover:bg-orange-500 hover:text-white transition-colors"
                            aria-label="Set as cover photo"
                        >
                            <Star className="h-5 w-5" />
                        </button>
                    )}

                    {/* Remove */}
                    <button
                        onClick={() => onRemove(image.id)}
                        className="p-2 bg-white/90 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                        aria-label="Remove image"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

interface ImageGalleryProps {
    images: GalleryImage[];
    onImagesChange: (images: GalleryImage[]) => void;
    maxImages?: number;
}

export function ImageGallery({ images, onImagesChange, maxImages = 10 }: ImageGalleryProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = images.findIndex((img) => img.id === active.id);
            const newIndex = images.findIndex((img) => img.id === over.id);

            const newImages = arrayMove(images, oldIndex, newIndex);

            // First image is always the cover
            const updatedImages = newImages.map((img, idx) => ({
                ...img,
                isCover: idx === 0,
            }));

            onImagesChange(updatedImages);
        }
    }, [images, onImagesChange]);

    const handleRemove = useCallback((id: string) => {
        const newImages = images.filter((img) => img.id !== id);
        // Ensure first remaining image becomes cover
        if (newImages.length > 0 && !newImages.some(img => img.isCover)) {
            newImages[0].isCover = true;
        }
        onImagesChange(newImages);
    }, [images, onImagesChange]);

    const handleSetCover = useCallback((id: string) => {
        const targetIndex = images.findIndex((img) => img.id === id);
        if (targetIndex === -1) return;

        // Move to front
        const newImages = arrayMove(images, targetIndex, 0).map((img, idx) => ({
            ...img,
            isCover: idx === 0,
        }));

        onImagesChange(newImages);
    }, [images, onImagesChange]);

    if (images.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>No images uploaded yet</p>
                <p className="text-sm mt-1">Drag and drop images or click to upload</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                    {images.length} / {maxImages} images
                </p>
                <p className="text-xs text-gray-500">
                    Drag to reorder • First image is cover
                </p>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={images.map((img) => img.id)}
                    strategy={rectSortingStrategy}
                >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {images.map((image) => (
                            <SortableImage
                                key={image.id}
                                image={image}
                                onRemove={handleRemove}
                                onSetCover={handleSetCover}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
