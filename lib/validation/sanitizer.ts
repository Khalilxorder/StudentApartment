/**
 * HTML/Text sanitization utilities
 * Prevents XSS attacks in user-generated content
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Strip all HTML tags from text
 */
export function stripTags(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize text for safe display (strips HTML, trims, limits length)
 */
export function sanitizeText(
    text: string,
    maxLength?: number
): string {
    if (!text) return '';

    let sanitized = stripTags(text).trim();

    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.slice(0, maxLength) + '...';
    }

    return sanitized;
}

/**
 * Sanitize for use in HTML attributes
 */
export function sanitizeAttribute(value: string): string {
    if (!value) return '';
    return value
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Validate and sanitize URL (prevent javascript: and data: schemes)
 */
export function sanitizeUrl(url: string): string | null {
    if (!url) return null;

    const trimmed = url.trim().toLowerCase();

    // Block dangerous schemes
    if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')
    ) {
        return null;
    }

    // Allow http, https, mailto, tel
    if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('tel:') ||
        trimmed.startsWith('/')
    ) {
        return url.trim();
    }

    // If no scheme, assume https
    if (!trimmed.includes('://')) {
        return 'https://' + url.trim();
    }

    return null;
}

/**
 * Sanitize email for display (basic obfuscation)
 */
export function obfuscateEmail(email: string): string {
    if (!email || !email.includes('@')) return '[email protected]';

    const [local, domain] = email.split('@');
    const obfuscatedLocal = local.slice(0, 2) + '***';

    return `${obfuscatedLocal}@${domain}`;
}

/**
 * Remove potentially dangerous content from JSON
 */
export function sanitizeJson(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = escapeHtml(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'string' ? escapeHtml(item) : sanitizeJson(item)
            );
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeJson(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}
