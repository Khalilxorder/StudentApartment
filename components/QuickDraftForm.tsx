'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveDraft } from '@/app/(admin)/admin/actions';
import { SaveIcon, AlertCircle } from 'lucide-react';

interface QuickDraftFormProps {
  initialId?: string;
  onDraftSaved?: (draftId: string) => void;
}

/**
 * Quick Draft Form - Lightweight form for owners to save progress
 * Requires only: title, address, monthly rent, and optional photos
 * Allows resuming listing later with all details
 */
export function QuickDraftForm({ initialId, onDraftSaved }: QuickDraftFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      setImageUrls(prev => [...prev, ...urls]);
    } catch (err) {
      setError('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    if (price === '' || (typeof price === 'number' && !Number.isFinite(price))) {
      setError('Monthly rent is required');
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        const formData = new FormData();
        formData.set('id', initialId || '');
        formData.set('title', title);
        formData.set('address', address);
        formData.set('price_huf', price.toString());
        imageUrls.forEach((url) => formData.append('image_urls', url));

        const result = await saveDraft(formData);

        setSuccess(true);
        onDraftSaved?.(result.id);

        // Auto-dismiss success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to save draft');
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2">
        <SaveIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">Quick Draft</h3>
          <p className="text-sm text-blue-700">Save your progress with basic info. You can complete details later.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-2 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
          Draft saved successfully! You can resume editing anytime.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Listing Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Modern 2BR in District 5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address *
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main Street, Budapest"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Rent (HUF) *
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
            placeholder="e.g., 150000"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Quick photo upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Photos (optional)
        </label>
        <div className="space-y-2">
          {imageUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300">
                  <img src={url} alt={`Draft ${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || uploading}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition text-sm"
      >
        {isPending ? 'Saving...' : 'Save Draft'}
      </button>

      <p className="text-xs text-gray-600 text-center">
        Your draft is private and only visible to you. Complete your listing anytime to publish it.
      </p>
    </form>
  );
}
