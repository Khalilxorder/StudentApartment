import { createClient } from '@/utils/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete user's profile data first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      logger.error({ profileError, userId: user.id }, 'Error deleting profile');
    }

    // Delete user's favorites
    const { error: favoritesError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id);

    if (favoritesError) {
      logger.error({ favoritesError, userId: user.id }, 'Error deleting favorites');
    }

    // Delete user's bookings
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .eq('user_id', user.id);

    if (bookingsError) {
      logger.error({ bookingsError, userId: user.id }, 'Error deleting bookings');
    }

    // Delete user's messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (messagesError) {
      logger.error({ messagesError, userId: user.id }, 'Error deleting messages');
    }

    // Delete user's search history
    const { error: searchError } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id);

    if (searchError) {
      logger.error({ searchError, userId: user.id }, 'Error deleting search history');
    }

    // Finally, delete the user account
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      logger.error({ deleteError, userId: user.id }, 'Error deleting user account');
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    logger.error({ error }, 'Unexpected error in delete-account');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
