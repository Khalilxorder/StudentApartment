/**
 * File upload validation for security
 * Validates file type, size, and content integrity
 */

export interface FileValidationConfig {
    maxSize: number; // bytes
    allowedTypes: string[];
    allowedExtensions: string[];
}

export interface FileValidationResult {
    valid: boolean;
    errors: string[];
    metadata?: {
        size: number;
        type: string;
        extension: string;
    };
}

// MIME type magic byte signatures
const MIME_SIGNATURES: Record<string, string[]> = {
    'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
    'image/png': ['89504e47'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646'],
    'application/pdf': ['25504446'],
};

// Default configs for different upload types
export const IMAGE_CONFIG: FileValidationConfig = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
};

export const DOCUMENT_CONFIG: FileValidationConfig = {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['pdf'],
};

export const AVATAR_CONFIG: FileValidationConfig = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
};

/**
 * Validate a file against security requirements
 */
export async function validateFile(
    file: File,
    config: FileValidationConfig
): Promise<FileValidationResult> {
    const errors: string[] = [];

    // Check if file exists
    if (!file || file.size === 0) {
        return {
            valid: false,
            errors: ['No file provided or file is empty'],
        };
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    // Size check
    if (file.size > config.maxSize) {
        const maxMB = Math.round(config.maxSize / 1024 / 1024);
        errors.push(`File too large. Maximum size: ${maxMB}MB`);
    }

    // MIME type check
    if (!config.allowedTypes.includes(file.type)) {
        errors.push(`File type '${file.type}' not allowed. Allowed: ${config.allowedTypes.join(', ')}`);
    }

    // Extension check
    if (!config.allowedExtensions.includes(extension)) {
        errors.push(`File extension '.${extension}' not allowed`);
    }

    // Magic byte verification (prevent MIME type spoofing)
    try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const magic = Array.from(bytes.slice(0, 4))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const expectedSignatures = MIME_SIGNATURES[file.type];
        if (expectedSignatures && !expectedSignatures.some(sig => magic.startsWith(sig))) {
            errors.push('File content does not match declared type (possible spoofing attempt)');
        }
    } catch (error) {
        errors.push('Failed to verify file integrity');
    }

    return {
        valid: errors.length === 0,
        errors,
        metadata: {
            size: file.size,
            type: file.type,
            extension,
        },
    };
}

/**
 * Validate file from buffer (for server-side)
 */
export function validateFileBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    config: FileValidationConfig
): FileValidationResult {
    const errors: string[] = [];
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Size check
    if (buffer.length > config.maxSize) {
        const maxMB = Math.round(config.maxSize / 1024 / 1024);
        errors.push(`File too large. Maximum size: ${maxMB}MB`);
    }

    if (buffer.length === 0) {
        errors.push('File is empty');
    }

    // MIME type check
    if (!config.allowedTypes.includes(mimeType)) {
        errors.push(`File type '${mimeType}' not allowed`);
    }

    // Extension check
    if (!config.allowedExtensions.includes(extension)) {
        errors.push(`File extension '.${extension}' not allowed`);
    }

    // Magic byte verification
    const magic = buffer.toString('hex', 0, 4);
    const expectedSignatures = MIME_SIGNATURES[mimeType];
    if (expectedSignatures && !expectedSignatures.some(sig => magic.startsWith(sig))) {
        errors.push('File content does not match declared type');
    }

    return {
        valid: errors.length === 0,
        errors,
        metadata: {
            size: buffer.length,
            type: mimeType,
            extension,
        },
    };
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^\.+/, '')
        .slice(0, 255);
}
