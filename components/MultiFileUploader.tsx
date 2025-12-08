'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { ImageGallery, GalleryImage } from './ImageGallery';

interface UploadProgress {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
    error?: string;
    result?: {
        url: string;
        thumbnailUrl?: string;
    };
}

interface MultiFileUploaderProps {
    apartmentId?: string;
    existingImages?: GalleryImage[];
    onImagesChange: (images: GalleryImage[]) => void;
    maxImages?: number;
    maxSizeMB?: number;
}

export function MultiFileUploader({
    apartmentId,
    existingImages = [],
    onImagesChange,
    maxImages = 10,
    maxSizeMB = 10,
}: MultiFileUploaderProps) {
    const [images, setImages] = useState<GalleryImage[]>(existingImages);
    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllers = useRef<Map<string, AbortController>>(new Map());

    const validateFile = (file: File): string | null => {
        const maxSize = maxSizeMB * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

        if (!allowedTypes.includes(file.type)) {
            return `${file.name}: Unsupported format. Use JPEG, PNG, or WebP.`;
        }
        if (file.size > maxSize) {
            return `${file.name}: File too large. Max ${maxSizeMB}MB.`;
        }
        return null;
    };

    const uploadFile = async (upload: UploadProgress): Promise<UploadProgress> => {
        const controller = new AbortController();
        abortControllers.current.set(upload.id, controller);

        try {
            // Get CSRF token
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_token='))
                ?.split('=')[1];

            const formData = new FormData();
            formData.append('files', upload.file);
            if (apartmentId) {
                formData.append('apartmentId', apartmentId);
            }

            // Use XMLHttpRequest for progress tracking
            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const progress = Math.round((e.loaded / e.total) * 100);
                        setUploads(prev =>
                            prev.map(u =>
                                u.id === upload.id ? { ...u, progress, status: 'uploading' } : u
                            )
                        );
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            const file = data.files?.[0];

                            // Update to processing status
                            setUploads(prev =>
                                prev.map(u =>
                                    u.id === upload.id
                                        ? { ...u, progress: 100, status: 'processing' }
                                        : u
                                )
                            );

                            // Simulate processing delay then complete
                            setTimeout(() => {
                                const result = {
                                    url: file?.optimized || file?.original || '',
                                    thumbnailUrl: file?.thumbnail,
                                };

                                setUploads(prev =>
                                    prev.map(u =>
                                        u.id === upload.id
                                            ? { ...u, status: 'complete', result }
                                            : u
                                    )
                                );

                                resolve({ ...upload, status: 'complete', result, progress: 100 });
                            }, 500);
                        } catch {
                            resolve({ ...upload, status: 'error', error: 'Invalid response' });
                        }
                    } else {
                        resolve({ ...upload, status: 'error', error: `Upload failed: ${xhr.status}` });
                    }
                });

                xhr.addEventListener('error', () => {
                    resolve({ ...upload, status: 'error', error: 'Network error' });
                });

                xhr.addEventListener('abort', () => {
                    resolve({ ...upload, status: 'error', error: 'Upload cancelled' });
                });

                xhr.open('POST', '/api/media/upload');
                xhr.setRequestHeader('X-CSRF-Token', csrfToken || '');
                xhr.send(formData);
            });
        } catch (err) {
            return {
                ...upload,
                status: 'error',
                error: err instanceof Error ? err.message : 'Upload failed',
            };
        } finally {
            abortControllers.current.delete(upload.id);
        }
    };

    const processFiles = useCallback(async (fileList: FileList | null) => {
        if (!fileList) return;

        setError(null);
        const files = Array.from(fileList);
        const remainingSlots = maxImages - images.length;

        if (files.length > remainingSlots) {
            setError(`Can only add ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}`);
            return;
        }

        // Validate all files first
        const validationErrors: string[] = [];
        files.forEach(file => {
            const err = validateFile(file);
            if (err) validationErrors.push(err);
        });

        if (validationErrors.length > 0) {
            setError(validationErrors.join('\n'));
            return;
        }

        // Create upload entries
        const newUploads: UploadProgress[] = files.map(file => ({
            id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            progress: 0,
            status: 'pending',
        }));

        setUploads(prev => [...prev, ...newUploads]);

        // Upload files concurrently (max 3 at a time)
        const concurrencyLimit = 3;
        const results: UploadProgress[] = [];

        for (let i = 0; i < newUploads.length; i += concurrencyLimit) {
            const batch = newUploads.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(batch.map(uploadFile));
            results.push(...batchResults);
        }

        // Add successful uploads to images
        const successfulUploads = results.filter(r => r.status === 'complete' && r.result);

        if (successfulUploads.length > 0) {
            const newImages: GalleryImage[] = successfulUploads.map((upload, idx) => ({
                id: upload.id,
                url: upload.result!.url,
                thumbnailUrl: upload.result!.thumbnailUrl,
                status: 'complete',
                isCover: images.length === 0 && idx === 0, // First image is cover if no existing
            }));

            const updatedImages = [...images, ...newImages];

            // Ensure first image is cover
            if (!updatedImages.some(img => img.isCover) && updatedImages.length > 0) {
                updatedImages[0].isCover = true;
            }

            setImages(updatedImages);
            onImagesChange(updatedImages);
        }

        // Clear completed uploads after delay
        setTimeout(() => {
            setUploads(prev => prev.filter(u => u.status !== 'complete'));
        }, 2000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [images, maxImages, apartmentId, onImagesChange]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        processFiles(e.dataTransfer.files);
    };

    const cancelUpload = (id: string) => {
        const controller = abortControllers.current.get(id);
        if (controller) {
            controller.abort();
        }
        setUploads(prev => prev.filter(u => u.id !== id));
    };

    const retryUpload = async (upload: UploadProgress) => {
        setUploads(prev =>
            prev.map(u =>
                u.id === upload.id ? { ...u, status: 'pending', error: undefined, progress: 0 } : u
            )
        );
        await uploadFile(upload);
    };

    const handleImagesChange = (newImages: GalleryImage[]) => {
        setImages(newImages);
        onImagesChange(newImages);
    };

    const canUpload = images.length < maxImages;

    return (
        <div className="space-y-6">
            {/* Upload Zone */}
            {canUpload && (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragActive
                            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }
          `}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        onChange={(e) => processFiles(e.target.files)}
                        className="hidden"
                    />

                    <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />

                    {isDragActive ? (
                        <p className="text-blue-600 font-medium text-lg">Drop images here...</p>
                    ) : (
                        <>
                            <p className="text-gray-700 font-medium mb-1">
                                Drag & drop images or click to upload
                            </p>
                            <p className="text-sm text-gray-500">
                                JPEG, PNG, WebP up to {maxSizeMB}MB • {maxImages - images.length} slots remaining
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-800 text-sm whitespace-pre-line">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-600 text-sm underline mt-1"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Active uploads */}
            {uploads.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Uploading...</h4>
                    {uploads.map((upload) => (
                        <div
                            key={upload.id}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                        >
                            <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded overflow-hidden">
                                <img
                                    src={URL.createObjectURL(upload.file)}
                                    alt={upload.file.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="flex-grow min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {upload.file.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {upload.status === 'uploading' && (
                                        <>
                                            <div className="flex-grow bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${upload.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 w-10">
                                                {upload.progress}%
                                            </span>
                                        </>
                                    )}
                                    {upload.status === 'processing' && (
                                        <span className="text-xs text-blue-600 flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Optimizing...
                                        </span>
                                    )}
                                    {upload.status === 'complete' && (
                                        <span className="text-xs text-green-600 flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Complete
                                        </span>
                                    )}
                                    {upload.status === 'error' && (
                                        <span className="text-xs text-red-600 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {upload.error}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-shrink-0">
                                {upload.status === 'error' ? (
                                    <button
                                        onClick={() => retryUpload(upload)}
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        Retry
                                    </button>
                                ) : upload.status !== 'complete' ? (
                                    <button
                                        onClick={() => cancelUpload(upload.id)}
                                        className="p-1 text-gray-400 hover:text-red-500"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Gallery with drag-drop reorder */}
            <ImageGallery
                images={images}
                onImagesChange={handleImagesChange}
                maxImages={maxImages}
            />
        </div>
    );
}
