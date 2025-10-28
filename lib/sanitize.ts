/**
 * Input sanitization utilities
 * Prevents XSS attacks by sanitizing user-generated content
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - Potentially dangerous HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Simple HTML sanitization - remove script tags and dangerous attributes
  let sanitized = dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '');

  // Only allow specific tags
  const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  
  sanitized = sanitized.replace(tagPattern, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      // For 'a' tags, only keep href and sanitize it
      if (tag.toLowerCase() === 'a') {
        const hrefMatch = match.match(/href\s*=\s*["']([^"']*)["']/i);
        if (hrefMatch && (hrefMatch[1].startsWith('http://') || hrefMatch[1].startsWith('https://'))) {
          return match.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        }
        return '';
      }
      return match;
    }
    return '';
  });

  return sanitized.trim();
}

/**
 * Sanitize plain text (strip all HTML tags)
 * @param dirty - Text that may contain HTML
 * @returns Plain text with no HTML
 */
export function sanitizePlainText(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Remove all HTML tags
  return dirty.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize user input for database storage
 * Removes dangerous content while preserving line breaks
 */
export function sanitizeUserInput(input: string, allowBasicFormatting: boolean = false): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  if (allowBasicFormatting) {
    // Allow basic formatting like bold, italic for things like apartment descriptions
    return sanitizeHTML(input);
  }

  // Strip all HTML for things like names, addresses, search queries
  return sanitizePlainText(input);
}

/**
 * Sanitize an object's string fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldsToSanitize: (keyof T)[],
  allowFormatting: boolean = false
): T {
  const sanitized = { ...obj };

  for (const field of fieldsToSanitize) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeUserInput(sanitized[field] as string, allowFormatting) as T[keyof T];
    }
  }

  return sanitized;
}
