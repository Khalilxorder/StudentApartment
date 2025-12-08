import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user privacy settings
    const { data: settings } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (settings) {
      return NextResponse.json(settings);
    }

    // Return default settings if none exist
    const defaultSettings = {
      profileVisibility: 'private',
      dataSharing: false,
      marketingEmails: false,
      analyticsTracking: true,
    };

    return NextResponse.json(defaultSettings);

  } catch (error) {
    logger.error({ error }, 'Privacy settings fetch error');
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const updates = await req.json();
    const userId = session.user.id;

    // Update or insert privacy settings
    const { data, error } = await supabase
      .from('user_privacy_settings')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, userId }, 'Privacy settings update error');
      return NextResponse.json(
        { error: 'Failed to update privacy settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    logger.error({ error }, 'Privacy settings update error');
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}