'use client';

import { useState, useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ChatImageUploaderProps {
  onImageSelect: (imageUrl: string) => void;
  disabled?: boolean;
}

export default function ChatImageUploader({ onImageSelect, disabled }: ChatImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    if (file.size > maxSize) {
      setError('Image must be less than 5MB.');
      return;
    }

    setError(null);
    setUploading(true);

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      // Get CSRF token
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'message');

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken || '',
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      onImageSelect(data.url);
      setPreview(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Upload Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className={`
          p-2 rounded-lg transition-colors
          ${disabled || uploading
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }
        `}
        title="Attach image"
        aria-label="Attach image"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
      </button>

      {/* Preview Overlay */}
      {preview && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="relative">
            <Image
              src={preview}
              alt="Upload preview"
              width={120}
              height={120}
              className="rounded-md object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
            <button
              onClick={handleCancelPreview}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}
