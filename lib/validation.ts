import { VALIDATION_PATTERNS } from '@/lib/security-middleware';

export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  custom?: (value: string) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateField(value: string, rules: ValidationRule): ValidationResult {
  const errors: string[] = [];

  // Required check
  if (rules.required && (!value || value.trim() === '')) {
    errors.push(rules.message || 'This field is required');
    return { isValid: false, errors };
  }

  // Skip other validations if field is empty and not required
  if (!value || value.trim() === '') {
    return { isValid: true, errors: [] };
  }

  const trimmedValue = value.trim();

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(trimmedValue)) {
    errors.push(rules.message || 'Invalid format');
  }

  // Length validations
  if (rules.minLength && trimmedValue.length < rules.minLength) {
    errors.push(rules.message || `Minimum length is ${rules.minLength} characters`);
  }

  if (rules.maxLength && trimmedValue.length > rules.maxLength) {
    errors.push(rules.message || `Maximum length is ${rules.maxLength} characters`);
  }

  // Custom validation
  if (rules.custom && !rules.custom(trimmedValue)) {
    errors.push(rules.message || 'Invalid value');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateForm(data: Record<string, string>, schema: Record<string, ValidationRule>): ValidationResult {
  const allErrors: string[] = [];
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const result = validateField(data[field] || '', rules);
    if (!result.isValid) {
      isValid = false;
      allErrors.push(...result.errors.map(error => `${field}: ${error}`));
    }
  }

  return { isValid, errors: allErrors };
}

// Predefined validation schemas
export const VALIDATION_SCHEMAS = {
  email: {
    required: true,
    pattern: VALIDATION_PATTERNS.email,
    message: 'Please enter a valid email address',
  },

  password: {
    required: true,
    pattern: VALIDATION_PATTERNS.password,
    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  },

  name: {
    required: true,
    pattern: VALIDATION_PATTERNS.name,
    minLength: 2,
    maxLength: 50,
    message: 'Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes',
  },

  phone: {
    required: true,
    pattern: VALIDATION_PATTERNS.phone,
    message: 'Please enter a valid phone number',
  },

  zipCode: {
    required: true,
    pattern: VALIDATION_PATTERNS.zipCode,
    message: 'Please enter a valid ZIP code (12345 or 12345-6789)',
  },

  apartmentTitle: {
    required: true,
    minLength: 10,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-',.]+$/,
    message: 'Title must be 10-200 characters and contain only letters, numbers, spaces, hyphens, commas, periods, and apostrophes',
  },

  apartmentDescription: {
    required: true,
    minLength: 50,
    maxLength: 2000,
    message: 'Description must be 50-2000 characters',
  },

  price: {
    required: true,
    pattern: /^\d+(\.\d{2})?$/,
    message: 'Please enter a valid price (e.g., 1200.00)',
  },

  url: {
    required: true,
    pattern: VALIDATION_PATTERNS.url,
    message: 'Please enter a valid URL starting with http:// or https://',
  },
};

// Sanitization functions
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - in production, use a proper HTML sanitizer
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}