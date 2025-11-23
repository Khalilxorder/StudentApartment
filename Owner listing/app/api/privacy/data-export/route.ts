import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
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

    const userId = session.user.id;

    // Collect all user data
    const userData: any = {
      exportDate: new Date().toISOString(),
      userId: userId,
      data: {}
    };

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      userData.data.profile = profile;
    }

    // Get user apartments (if owner)
    const { data: apartments } = await supabase
      .from('apartments')
      .select('*')
      .eq('owner_id', userId);

    if (apartments && apartments.length > 0) {
      userData.data.apartments = apartments;
    }

    // Get user reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId);

    if (reviews && reviews.length > 0) {
      userData.data.reviews = reviews;
    }

    // Get user saved searches
    const { data: savedSearches } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId);

    if (savedSearches && savedSearches.length > 0) {
      userData.data.savedSearches = savedSearches;
    }

    // Get user messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (messages && messages.length > 0) {
      userData.data.messages = messages;
    }

    // Get user notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (notifications && notifications.length > 0) {
      userData.data.notifications = notifications;
    }

    // Get user payment history (if applicable)
    // Note: Payment details are handled by Stripe and may need separate export

    // Create JSON export
    const jsonData = JSON.stringify(userData, null, 2);

    // In a production environment, you would:
    // 1. Store this data temporarily
    // 2. Send an email with download link
    // 3. Implement proper data anonymization if needed

    return new NextResponse(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="student-apartments-data-${userId}.json"`,
      },
    });

  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

// Also provide a GET endpoint to check export status
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

    // In a real implementation, you would check for pending export jobs
    // For now, just return that no export is in progress
    return NextResponse.json({
      status: 'ready',
      message: 'Ready to export data'
    });

  } catch (error) {
    console.error('Export status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check export status' },
      { status: 500 }
    );
  }
}