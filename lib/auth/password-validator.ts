/**
 * Enterprise-grade password validation
 * Enforces strong password requirements for security compliance
 */

export interface PasswordRequirements {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
}

export const DEFAULT_REQUIREMENTS: PasswordRequirements = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
};

export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    strength: PasswordStrength;
    score: number; // 0-100
}

// Common passwords to block
const COMMON_PASSWORDS = [
    'password123',
    'admin123',
    'welcome123',
    '12345678',
    'qwerty123',
    'letmein',
    'password1',
    'iloveyou',
    'sunshine',
    'princess',
];

/**
 * Validate password against enterprise requirements
 */
export function validatePassword(
    password: string,
    requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): ValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length checks
    if (password.length < requirements.minLength) {
        errors.push(`Password must be at least ${requirements.minLength} characters`);
    } else {
        score += 20;
    }

    if (password.length > requirements.maxLength) {
        errors.push(`Password must be less than ${requirements.maxLength} characters`);
    }

    // Bonus for extra length
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;

    // Character requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[@$!%*?&#^()_+=\-{}[\]:;"'<>,.?/~`|\\]/.test(password);

    if (requirements.requireUppercase && !hasUppercase) {
        errors.push('Password must contain at least one uppercase letter');
    } else if (hasUppercase) {
        score += 15;
    }

    if (requirements.requireLowercase && !hasLowercase) {
        errors.push('Password must contain at least one lowercase letter');
    } else if (hasLowercase) {
        score += 15;
    }

    if (requirements.requireNumbers && !hasNumbers) {
        errors.push('Password must contain at least one number');
    } else if (hasNumbers) {
        score += 15;
    }

    if (requirements.requireSpecialChars && !hasSpecialChars) {
        errors.push('Password must contain at least one special character (@$!%*?&#)');
    } else if (hasSpecialChars) {
        score += 15;
    }

    // Check for common passwords
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
        errors.push('Password is too common. Please choose a more unique password');
        score = Math.max(0, score - 30);
    }

    // Check for sequential characters
    if (/(.)\1{2,}/.test(password)) {
        errors.push('Password should not contain repeated characters (e.g., "aaa")');
        score = Math.max(0, score - 10);
    }

    // Determine strength
    let strength: PasswordStrength;
    if (score >= 80) {
        strength = 'very-strong';
    } else if (score >= 60) {
        strength = 'strong';
    } else if (score >= 40) {
        strength = 'medium';
    } else {
        strength = 'weak';
    }

    return {
        valid: errors.length === 0,
        errors,
        strength,
        score: Math.min(100, score),
    };
}

/**
 * Get color class for password strength indicator
 */
export function getStrengthColor(strength: PasswordStrength): string {
    switch (strength) {
        case 'weak':
            return 'text-red-600 bg-red-100';
        case 'medium':
            return 'text-yellow-600 bg-yellow-100';
        case 'strong':
            return 'text-green-600 bg-green-100';
        case 'very-strong':
            return 'text-green-700 bg-green-200';
    }
}

/**
 * Get label for password strength
 */
export function getStrengthLabel(strength: PasswordStrength): string {
    switch (strength) {
        case 'weak':
            return 'Weak';
        case 'medium':
            return 'Medium';
        case 'strong':
            return 'Strong';
        case 'very-strong':
            return 'Very Strong';
    }
}
