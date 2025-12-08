import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, ApiErrors } from '@/lib/api-response';

/**
 * GDPR Data Deletion API (Right to be Forgotten)
 * Permanently deletes all user data
 */
export async function DELETE(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from session
        const sessionCookie = req.cookies.get('sb-access-token');
        if (!sessionCookie) {
            return ApiErrors.unauthorized('Not authenticated');
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(sessionCookie.value);
        if (authError || !user) {
            return ApiErrors.unauthorized('Invalid session');
        }

        // Get confirmation from request body
        const body = await req.json();
        if (body.confirmation !== 'DELETE') {
            return ApiErrors.badRequest('Confirmation required. Send {"confirmation": "DELETE"}');
        }

        // Delete in order (foreign keys)
        const userId = user.id;

        // 1. Delete messages
        await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        // 2. Delete reviews
        await supabase.from('reviews').delete().eq('user_id', userId);

        // 3. Delete favorites
        await supabase.from('favorites').delete().eq('user_id', userId);

        // 4. Delete apartments (if owner)
        await supabase.from('apartments').delete().eq('owner_id', userId);

        // 5. Delete profile
        await supabase.from('profiles').delete().eq('id', userId);

        // 6. Delete auth user (this will cascade to related auth tables)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteError) {
            throw deleteError;
        }

        return successResponse(
            { deleted: true, user_id: userId },
            'All user data has been permanently deleted'
        );
    } catch (error: any) {
        logger.error({ err: error }, 'Data deletion error:');
        return ApiErrors.internalError('Failed to delete data');
    }
}
