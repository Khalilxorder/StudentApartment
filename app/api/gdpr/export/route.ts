import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, ApiErrors } from '@/lib/api-response';

/**
 * GDPR Data Export API
 * Allows users to export all their personal data
 */
export async function GET(req: NextRequest) {
    try {
        // Get user from session
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get session from cookies
        const sessionCookie = req.cookies.get('sb-access-token');
        if (!sessionCookie) {
            return ApiErrors.unauthorized('Not authenticated');
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(sessionCookie.value);
        if (authError || !user) {
            return ApiErrors.unauthorized('Invalid session');
        }

        // Collect all user data
        const userData: any = {
            user_id: user.id,
            email: user.email,
            created_at: user.created_at,
            export_date: new Date().toISOString(),
            data: {},
        };

        // Get profile data
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            userData.data.profile = profile;
        }

        // Get user's apartments (if owner)
        const { data: apartments } = await supabase
            .from('apartments')
            .select('*')
            .eq('owner_id', user.id);

        if (apartments && apartments.length > 0) {
            userData.data.apartments = apartments;
        }

        // Get favorites
        const { data: favorites } = await supabase
            .from('favorites')
            .select('*, apartments(*)')
            .eq('user_id', user.id);

        if (favorites && favorites.length > 0) {
            userData.data.favorites = favorites;
        }

        // Get messages
        const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        if (messages && messages.length > 0) {
            userData.data.messages = messages;
        }

        // Get reviews
        const { data: reviews } = await supabase
            .from('reviews')
            .select('*')
            .eq('user_id', user.id);

        if (reviews && reviews.length > 0) {
            userData.data.reviews = reviews;
        }

        return successResponse(userData, 'Data exported successfully');
    } catch (error: any) {
        logger.error({ err: error }, 'Data export error:');
        return ApiErrors.internalError('Failed to export data');
    }
}
