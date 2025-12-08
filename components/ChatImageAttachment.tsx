'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ImagePlus, X, Loader2, Send } from 'lucide-react';

interface ChatImageAttachmentProps {
    onSend: (imageUrl: string, message?: string) => Promise<void>;
    disabled?: boolean;
}

/**
 * Chat Image Attachment component
 * Drag-drop or click to upload with preview before send
 */
export function ChatImageAttachment({ onSend, disabled = false }: ChatImageAttachmentProps) {
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB');
            return;
        }

        setImage(file);
        setPreview(URL.createObjectURL(file));
        setError(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleSend = async () => {
        if (!image) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', image);
            formData.append('type', 'chat');

            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrf_token='))
                ?.split('=')[1];

            const response = await fetch('/api/media/upload', {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrfToken || '' },
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            const imageUrl = data.url || data.optimized || data.original;

            await onSend(imageUrl, message.trim() || undefined);

            // Reset state
            setImage(null);
            setPreview(null);
            setMessage('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send image');
        } finally {
            setUploading(false);
        }
    };

    const cancel = () => {
        if (preview) URL.revokeObjectURL(preview);
        setImage(null);
        setPreview(null);
        setMessage('');
        setError(null);
    };

    // Show preview mode if image selected
    if (preview) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="relative">
                    <div className="relative w-full max-w-xs mx-auto aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <Image
                            src={preview}
                            alt="Preview"
                            fill
                            className="object-contain"
                        />
                    </div>
                    {!uploading && (
                        <button
                            onClick={cancel}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Add a caption..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                        disabled={uploading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={uploading || disabled}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        {uploading ? 'Sending...' : 'Send'}
                    </button>
                </div>

                {error && (
                    <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
                )}
            </div>
        );
    }

    // Show upload trigger
    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
            />
            <button
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
                title="Attach image"
            >
                <ImagePlus className="h-5 w-5" />
            </button>
        </div>
    );
}

/**
 * Chat message with image display
 */
export function ChatImageMessage({
    imageUrl,
    caption,
    isOwn,
    timestamp,
}: {
    imageUrl: string;
    caption?: string;
    isOwn: boolean;
    timestamp: string;
}) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-xs rounded-lg overflow-hidden ${isOwn ? 'bg-yellow-400' : 'bg-white border border-gray-200'
                    }`}
            >
                <div className="relative aspect-square w-64">
                    <Image
                        src={imageUrl}
                        alt="Chat image"
                        fill
                        className="object-cover"
                    />
                </div>
                {caption && (
                    <p className={`px-3 py-2 text-sm ${isOwn ? 'text-gray-900' : 'text-gray-700'}`}>
                        {caption}
                    </p>
                )}
                <p className={`px-3 pb-2 text-xs ${isOwn ? 'text-gray-700' : 'text-gray-500'}`}>
                    {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}
