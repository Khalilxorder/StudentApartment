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

        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // Fetch secret from DB
        const { data: mfaData, error } = await supabase
            .from('user_mfa')
            .select('totp_secret, enabled')
            .eq('user_id', user.id)
            .single();

        if (error || !mfaData || !mfaData.enabled) {
            return NextResponse.json({ error: 'MFA not enabled for this user' }, { status: 400 });
        }

        // Verify
        const isValid = authenticator.verify({ token, secret: mfaData.totp_secret });

        if (!isValid) {
            // Log security event
            logger.warn({ userId: user.id }, 'MFA Challenge failed: Invalid Code');
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        }

        // Success - Set Cookie
        const response = NextResponse.json({ success: true });
        response.cookies.set('mfa_verified', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        logger.info({ userId: user.id }, 'MFA Challenge passed');

        return response;

    } catch (error: any) {
        logger.error(error, 'MFA challenge failed');
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
