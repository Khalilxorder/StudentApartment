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
    const { confirmDeletion } = await req.json();

    if (!confirmDeletion) {
      return NextResponse.json(
        { error: 'Deletion must be explicitly confirmed' },
        { status: 400 }
      );
    }

    // Start a transaction-like deletion process
    // Note: In a real implementation, you might want to anonymize rather than delete
    // to maintain referential integrity and comply with legal requirements

    const deletionResults = {
      profile: false,
      apartments: false,
      reviews: false,
      messages: false,
      notifications: false,
      savedSearches: false,
      authAccount: false,
    };

    // Delete user profile
    try {
      const { error } = await getSupabaseClient()`n        .from('user_profiles')
        .delete()
        .eq('id', userId);

      deletionResults.profile = !error;
    } catch (error) {
      console.error('Profile deletion error:', error);
    }

    // Delete user's apartments
    try {
      const { error } = await getSupabaseClient()`n        .from('apartments')
        .delete()
        .eq('owner_id', userId);

      deletionResults.apartments = !error;
    } catch (error) {
      console.error('Apartments deletion error:', error);
    }

    // Delete user's reviews
    try {
      const { error } = await getSupabaseClient()`n        .from('reviews')
        .delete()
        .eq('user_id', userId);

      deletionResults.reviews = !error;
    } catch (error) {
      console.error('Reviews deletion error:', error);
    }

    // Delete user's messages
    try {
      const { error } = await getSupabaseClient()`n        .from('messages')
        .delete()
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

      deletionResults.messages = !error;
    } catch (error) {
      console.error('Messages deletion error:', error);
    }

    // Delete user's notifications
    try {
      const { error } = await getSupabaseClient()`n        .from('notifications')
        .delete()
        .eq('user_id', userId);

      deletionResults.notifications = !error;
    } catch (error) {
      console.error('Notifications deletion error:', error);
    }

    // Delete user's saved searches
    try {
      const { error } = await getSupabaseClient()`n        .from('saved_searches')
        .delete()
        .eq('user_id', userId);

      deletionResults.savedSearches = !error;
    } catch (error) {
      console.error('Saved searches deletion error:', error);
    }

    // Note: Auth account deletion should be handled through Supabase Auth
    // This requires special handling and confirmation

    // Log the deletion request
    console.log(`Data deletion requested for user ${userId}:`, deletionResults);

    // Check if all deletions were successful
    const allSuccessful = Object.values(deletionResults).every(result => result);

    if (allSuccessful) {
      return NextResponse.json({
        success: true,
        message: 'Your data has been successfully deleted',
        details: deletionResults,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Some data could not be deleted. Please contact support.',
        details: deletionResults,
      }, { status: 207 }); // 207 Multi-Status
    }

  } catch (error) {
    console.error('Data deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    );
  }
}