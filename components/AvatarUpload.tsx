'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Camera, Loader2, X, User } from 'lucide-react';
import { createClient } from '@/utils/supabaseClient';

interface AvatarUploadProps {
    currentAvatarUrl?: string | null;
    userId: string;
    onUploadComplete?: (url: string) => void;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
    sm: { container: 'w-16 h-16', icon: 'h-6 w-6', camera: 'p-1' },
    md: { container: 'w-24 h-24', icon: 'h-8 w-8', camera: 'p-1.5' },
    lg: { container: 'w-32 h-32', icon: 'h-12 w-12', camera: 'p-2' },
};

/**
 * Avatar upload component with instant preview and persistence
 * Handles image compression and Supabase storage upload
 */
export function AvatarUpload({
    currentAvatarUrl,
    userId,
    onUploadComplete,
    size = 'lg',
}: AvatarUploadProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    const sizes = sizeClasses[size];

    const uploadAvatar = useCallback(async (file: File) => {
        setUploading(true);
        setError(null);

        try {
            // Validate file
            if (!file.type.startsWith('image/')) {
                throw new Error('Please select an image file');
            }
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Image must be less than 5MB');
            }

            // Create form data for processing
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);
            formData.append('type', 'avatar');

            // Get CSRF token
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_token='))
                ?.split('=')[1];

            // Upload via media API for processing
            const response = await fetch('/api/media/upload', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': csrfToken || '',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Upload failed');
            }

            const result = await response.json();
            const newAvatarUrl = result.url || result.optimized || result.original;

            if (!newAvatarUrl) {
                throw new Error('No URL returned from upload');
            }

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    avatar_url: newAvatarUrl,
                    updated_at: new Date().toISOString(),
                });

            if (updateError) {
                console.error('Error updating profile:', updateError);
                // Don't throw - the image is uploaded, just profile wasn't updated
            }

            // Also update profiles_owner if exists
            await supabase
                .from('profiles_owner')
                .update({ avatar_url: newAvatarUrl })
                .eq('id', userId);

            setAvatarUrl(newAvatarUrl);
            onUploadComplete?.(newAvatarUrl);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setError(message);
            console.error('Avatar upload error:', err);
        } finally {
            setUploading(false);
        }
    }, [userId, onUploadComplete, supabase]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadAvatar(file);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleRemove = async () => {
        setAvatarUrl(null);

        // Update profile to remove avatar
        await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', userId);

        await supabase
            .from('profiles_owner')
            .update({ avatar_url: null })
            .eq('id', userId);
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className={`relative ${sizes.container} rounded-full group`}>
                {/* Avatar image or placeholder */}
                <div className={`${sizes.container} rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200`}>
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt="Profile avatar"
                            fill
                            className="object-cover"
                            sizes={size === 'lg' ? '128px' : size === 'md' ? '96px' : '64px'}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <User className={`${sizes.icon} text-gray-400`} />
                        </div>
                    )}
                </div>

                {/* Upload overlay */}
                {!uploading && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className={`absolute bottom-0 right-0 ${sizes.camera} bg-yellow-500 hover:bg-yellow-600 rounded-full shadow-lg transition-colors`}
                        aria-label="Upload avatar"
                    >
                        <Camera className="h-4 w-4 text-white" />
                    </button>
                )}

                {/* Loading overlay */}
                {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                )}

                {/* Remove button */}
                {avatarUrl && !uploading && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove avatar"
                    >
                        <X className="h-3 w-3 text-white" />
                    </button>
                )}

                {/* Hidden file input */}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {/* Error message */}
            {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            {/* Help text */}
            <p className="text-xs text-gray-500 text-center">
                Click camera to upload • JPG, PNG, WebP • Max 5MB
            </p>
        </div>
    );
}
