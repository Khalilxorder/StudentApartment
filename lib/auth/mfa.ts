/**
 * Multi-Factor Authentication (MFA) Implementation
 * Provides TOTP-based 2FA with backup codes
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// TOTP configuration
const TOTP_WINDOW = 1; // Allow 1 step before/after current
const TOTP_STEP = 30; // 30 seconds per code
const TOTP_DIGITS = 6;

export interface MFASetupResult {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}

export interface MFAStatus {
    enabled: boolean;
    backupCodesRemaining: number;
}

/**
 * Generate a random base32 secret for TOTP
 */
export function generateTOTPSecret(): string {
    const buffer = crypto.randomBytes(20);
    return base32Encode(buffer);
}

/**
 * Generate QR code URL for authenticator apps
 */
export function generateQRCodeUrl(secret: string, userEmail: string, issuer = 'Student Apartments'): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(userEmail);
    const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;

    // Return URL for QR code generation (use a library like 'qrcode' on frontend)
    return otpauthUrl;
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
        codes.push(formatted);
    }
    return codes;
}

/**
 * Verify a TOTP token
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    const currentTimeStep = Math.floor(now / TOTP_STEP);

    // Check current time and adjacent windows
    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
        const timeStep = currentTimeStep + i;
        const expectedToken = generateTOTP(secret, timeStep);

        if (token === expectedToken) {
            return true;
        }
    }

    return false;
}

/**
 * Generate TOTP code for a specific time step
 */
function generateTOTP(secret: string, timeStep: number): string {
    const secretBytes = base32Decode(secret);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(timeStep));

    const hmac = crypto.createHmac('sha1', secretBytes);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, TOTP_DIGITS);
    return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Hash backup code for storage
 */
export function hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify backup code against stored hash
 */
export function verifyBackupCode(code: string, hash: string): boolean {
    return hashBackupCode(code) === hash;
}

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
}

/**
 * Base32 decoding
 */
function base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < encoded.length; i++) {
        const idx = alphabet.indexOf(encoded[i].toUpperCase());
        if (idx === -1) continue;

        value = (value << 5) | idx;
        bits += 5;

        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return Buffer.from(output);
}

/**
 * Setup MFA for a user
 */
export async function setupMFA(userId: string, userEmail: string): Promise<MFASetupResult> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const secret = generateTOTPSecret();
    const qrCodeUrl = generateQRCodeUrl(secret, userEmail);
    const backupCodes = generateBackupCodes();

    // Hash backup codes for storage
    const hashedBackupCodes = backupCodes.map(code => ({
        code_hash: hashBackupCode(code),
        used: false
    }));

    // Store in database
    await supabase
        .from('user_mfa')
        .upsert({
            user_id: userId,
            totp_secret: secret,
            backup_codes: hashedBackupCodes,
            enabled: false, // User must verify first token to enable
            created_at: new Date().toISOString(),
        });

    return {
        secret,
        qrCodeUrl,
        backupCodes,
    };
}

/**
 * Enable MFA after user verifies first token
 */
export async function enableMFA(userId: string, token: string): Promise<boolean> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: mfaData } = await supabase
        .from('user_mfa')
        .select('totp_secret')
        .eq('user_id', userId)
        .single();

    if (!mfaData) {
        throw new Error('MFA not set up for this user');
    }

    const isValid = verifyTOTPToken(token, mfaData.totp_secret);

    if (isValid) {
        await supabase
            .from('user_mfa')
            .update({ enabled: true })
            .eq('user_id', userId);
    }

    return isValid;
}

/**
 * Verify MFA token during login
 */
export async function verifyMFA(userId: string, token: string): Promise<boolean> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: mfaData } = await supabase
        .from('user_mfa')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single();

    if (!mfaData) {
        return false;
    }

    // Try TOTP first
    if (verifyTOTPToken(token, mfaData.totp_secret)) {
        return true;
    }

    // Try backup codes
    const backupCodes = mfaData.backup_codes || [];
    for (let i = 0; i < backupCodes.length; i++) {
        const backup = backupCodes[i];
        if (!backup.used && verifyBackupCode(token, backup.code_hash)) {
            // Mark code as used
            backupCodes[i].used = true;
            await supabase
                .from('user_mfa')
                .update({ backup_codes: backupCodes })
                .eq('user_id', userId);

            return true;
        }
    }

    return false;
}

/**
 * Get MFA status for a user
 */
export async function getMFAStatus(userId: string): Promise<MFAStatus> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: mfaData } = await supabase
        .from('user_mfa')
        .select('enabled, backup_codes')
        .eq('user_id', userId)
        .single();

    if (!mfaData) {
        return { enabled: false, backupCodesRemaining: 0 };
    }

    const backupCodes = mfaData.backup_codes || [];
    const backupCodesRemaining = backupCodes.filter((b: any) => !b.used).length;

    return {
        enabled: mfaData.enabled,
        backupCodesRemaining,
    };
}

/**
 * Disable MFA for a user
 */
export async function disableMFA(userId: string): Promise<void> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
        .from('user_mfa')
        .delete()
        .eq('user_id', userId);
}
