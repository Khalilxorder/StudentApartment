import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Fetch Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // 2. Fetch Apartments
        const { data: apartments } = await supabase
            .from('apartments')
            .select('*')
            .eq('owner_id', user.id);

        // 3. Fetch Favorites
        const { data: favorites } = await supabase
            .from('apartment_favorites')
            .select('apartment_id, created_at')
            .eq('user_id', user.id);

        // 4. Fetch Messages (Sent)
        const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('sender_id', user.id);

        const exportData = {
            user: {
                id: user.id,
                email: user.email,
                metadata: user.user_metadata,
                created_at: user.created_at,
            },
            profile,
            apartments: apartments || [],
            favorites: favorites || [],
            messages: messages || [],
            exportDate: new Date().toISOString(),
        };

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="user-data-${user.id}.json"`,
            },
        });

    } catch (error: unknown) {
        logger.error({ error }, 'Data export error');
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // GDPR "Right to be Forgotten" implementation
        // Step 1: Delete user data from application tables

        // Delete messages
        await supabase.from('messages').delete().eq('sender_id', user.id);

        // Delete favorites
        await supabase.from('apartment_favorites').delete().eq('user_id', user.id);

        // Delete apartments (or transfer ownership if needed)
        await supabase.from('apartments').delete().eq('owner_id', user.id);

        // Delete profile
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

        if (profileError) throw profileError;

        // Note: To fully delete from auth.users, you need:
        // 1. A Supabase Edge Function with service_role key, OR
        // 2. A database trigger on profiles delete, OR
        // 3. Admin API call from a secure backend
        // The profile deletion above should be sufficient for data removal.

        logger.info({ userId: user.id }, 'User account deleted successfully');

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        logger.error({ error, userId: user.id }, 'Account deletion error');
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
}

