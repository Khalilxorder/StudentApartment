import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { token, secret } = await req.json();

        if (!token || !secret) {
            return NextResponse.json({ error: 'Missing token or secret' }, { status: 400 });
        }

        // Verify token
        const isValid = authenticator.verify({ token, secret });

        if (!isValid) {
            logger.warn({ userId: user.id }, 'MFA verification failed: Invalid token');
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        }

        // Generate backup codes
        const backupCodes = Array.from({ length: 10 }, () =>
            Math.random().toString(36).substring(2, 10).toUpperCase()
        );

        // Save to DB and Enable
        const { error } = await supabase
            .from('user_mfa')
            .update({
                totp_secret: secret,
                backup_codes: backupCodes, // In prod, we should hash these! For now, storing plain for the user to see once.
                enabled: true,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (error) throw error;

        // Sync to user_metadata for Middleware efficiency
        await supabase.auth.updateUser({
            data: { mfa_enabled: true }
        });

        // Set a cookie to remember verified status
        const response = NextResponse.json({ success: true, backupCodes });
        response.cookies.set('mfa_verified', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        logger.info({ userId: user.id }, 'MFA enabled successfully');

        return response;

    } catch (error: any) {
        logger.error(error, 'MFA enablement failed');
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
