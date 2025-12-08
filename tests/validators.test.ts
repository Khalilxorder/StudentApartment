/**
 * Test Suite for Enterprise Utilities
 * Validates password validation, file validation, and sanitization
 */

import { describe, it, expect } from 'vitest';
import { validatePassword, getStrengthLabel } from '@/lib/auth/password-validator';
import { validateFileBuffer, sanitizeFilename, IMAGE_CONFIG } from '@/lib/validation/file-validator';
import { escapeHtml, sanitizeUrl, sanitizeText } from '@/lib/validation/sanitizer';

describe('Password Validator', () => {
    it('should reject passwords shorter than 12 characters', () => {
        const result = validatePassword('Short1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should accept strong passwords', () => {
        const result = validatePassword('MySecure123!Pass');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.strength).toBe('very-strong');
    });

    it('should reject common passwords', () => {
        const result = validatePassword('Password123!');
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('too common'))).toBe(true);
    });

    it('should calculate strength correctly', () => {
        const weak = validatePassword('aaaaaaaaaaaa');
        const strong = validatePassword('C0mpl3x!P@ssw0rd');

        expect(weak.strength).toBe('weak');
        expect(strong.strength).toBe('very-strong');
        expect(strong.score).toBeGreaterThan(weak.score);
    });

    it('should provide correct strength labels', () => {
        expect(getStrengthLabel('weak')).toBe('Weak');
        expect(getStrengthLabel('very-strong')).toBe('Very Strong');
    });
});

describe('File Validator', () => {
    it('should reject files exceeding size limit', () => {
        const largeFile = Buffer.alloc(IMAGE_CONFIG.maxSize + 1);
        const result = validateFileBuffer(largeFile, 'test.jpg', 'image/jpeg', IMAGE_CONFIG);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('too large'))).toBe(true);
    });

    it('should reject invalid MIME types', () => {
        const buffer = Buffer.from('fake image data');
        const result = validateFileBuffer(buffer, 'test.exe', 'application/exe', IMAGE_CONFIG);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
    });

    it('should validate JPEG magic bytes', () => {
        const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
        const result = validateFileBuffer(jpegHeader, 'test.jpg', 'image/jpeg', IMAGE_CONFIG);

        expect(result.valid).toBe(true);
    });

    it('should detect MIME spoofing attempts', () => {
        const fakeJpeg = Buffer.from('This is not a JPEG');
        const result = validateFileBuffer(fakeJpeg, 'fake.jpg', 'image/jpeg', IMAGE_CONFIG);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('does not match'))).toBe(true);
    });

    it('should sanitize filenames correctly', () => {
        expect(sanitizeFilename('../../../etc/passwd')).toBe('_._._etc_passwd');
        expect(sanitizeFilename('file with spaces.jpg')).toBe('file_with_spaces.jpg');
        expect(sanitizeFilename('normal-file_123.png')).toBe('normal-file_123.png');
    });
});

describe('HTML Sanitizer', () => {
    it('should escape HTML special characters', () => {
        const input = '<script>alert("xss")</script>';
        const result = escapeHtml(input);

        expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
    });

    it('should sanitize text and remove HTML', () => {
        const input = '<b>Bold</b> text with <script>evil()</script>';
        const result = sanitizeText(input);

        expect(result).toBe('Bold text with evil()');
    });

    it('should block dangerous URL schemes', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
        expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
        expect(sanitizeUrl('vbscript:msgbox(1)')).toBeNull();
    });

    it('should allow safe URLs', () => {
        expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
        expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
        expect(sanitizeUrl('/relative/path')).toBe('/relative/path');
    });

    it('should add https to URLs without scheme', () => {
        expect(sanitizeUrl('example.com')).toBe('https://example.com');
    });
});

describe('Integration: Password + File Validation', () => {
    it('should handle multiple validation failures gracefully', () => {
        const passwordResult = validatePassword('weak');
        const fileBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
        const fileResult = validateFileBuffer(fileBuffer, 'huge.jpg', 'image/jpeg', IMAGE_CONFIG);

        expect(passwordResult.valid).toBe(false);
        expect(fileResult.valid).toBe(false);
        expect(passwordResult.errors.length).toBeGreaterThan(0);
        expect(fileResult.errors.length).toBeGreaterThan(0);
    });
});
