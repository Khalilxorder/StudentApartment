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

        // Generate secret
        const secret = authenticator.generateSecret();

        // Store temporarily or return to client to verify?
        // We should strictly not enable it yet. 
        // We will assume the client will send this secret back with the code to verify.
        // OR we can store it in the DB with enabled=false.
        // Let's store it but enabled=false.

        // Check if entry exists
        const { data: existing } = await supabase
            .from('user_mfa')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (existing) {
            // Update existing secret
            const { error } = await supabase
                .from('user_mfa')
                .update({ totp_secret: secret, enabled: false })
                .eq('user_id', user.id);

            if (error) throw error;
        } else {
            // Insert new
            const { error } = await supabase
                .from('user_mfa')
                .insert({ user_id: user.id, totp_secret: secret, enabled: false });

            if (error) throw error;
        }

        logger.info({ userId: user.id }, 'MFA secret generated');

        return NextResponse.json({
            secret,
            userEmail: user.email
        });

    } catch (error: any) {
        logger.error(error, 'MFA generation failed');
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
