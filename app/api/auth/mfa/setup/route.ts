import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setupMFA } from '@/lib/auth/mfa';
import { logger } from '@/lib/dev-logger';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Setup MFA for the user
        const result = await setupMFA(user.id, user.email!);

        logger.info({ userId: user.id }, 'MFA setup initiated');

        return NextResponse.json({
            secret: result.secret,
            qrCodeUrl: result.qrCodeUrl,
            backupCodes: result.backupCodes,
            message: 'MFA setup successful. Save your backup codes in a secure location.',
        });

    } catch (error) {
        logger.error({ err: error }, 'MFA setup error');
        return NextResponse.json(
            { error: 'Failed to setup MFA' },
            { status: 500 }
        );
    }
}
