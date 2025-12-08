'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface MediaFile {
  id: string;
  url: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
  status: 'uploading' | 'optimizing' | 'complete';
}

export function MediaUploader({
  apartmentId,
  onUploadComplete,
}: {
  apartmentId: string;
  onUploadComplete?: (files: MediaFile[]) => void;
}) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('apartmentId', apartmentId);

      // Get CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken || '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = (await response.json()) as { files: MediaFile[] };
      setFiles([...files, ...data.files]);
      onUploadComplete?.(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

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
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="hidden"
        />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop images here...</p>
        ) : (
          <div>
            <p className="text-gray-600 font-medium">
              Drag & drop images or click to select
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supported: JPEG, PNG, WebP (max 10MB each)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.id} className="relative group">
              <Image
                src={file.url}
                alt="Uploaded"
                width={200}
                height={200}
                className="w-full h-40 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    setFiles(files.filter((f) => f.id !== file.id))
                  }
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
              {file.status === 'optimizing' && (
                <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                  Optimizing...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
