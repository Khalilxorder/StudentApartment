import { createClient } from '@/utils/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

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
    const { error: profileError } = await getSupabaseClient()`n      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
    }

    // Delete user's favorites
    const { error: favoritesError } = await getSupabaseClient()`n      .from('favorites')
      .delete()
      .eq('user_id', user.id);

    if (favoritesError) {
      console.error('Error deleting favorites:', favoritesError);
    }

    // Delete user's bookings
    const { error: bookingsError } = await getSupabaseClient()`n      .from('bookings')
      .delete()
      .eq('user_id', user.id);

    if (bookingsError) {
      console.error('Error deleting bookings:', bookingsError);
    }

    // Delete user's messages
    const { error: messagesError } = await getSupabaseClient()`n      .from('messages')
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
    }

    // Delete user's search history
    const { error: searchError } = await getSupabaseClient()`n      .from('search_history')
      .delete()
      .eq('user_id', user.id);

    if (searchError) {
      console.error('Error deleting search history:', searchError);
    }

    // Finally, delete the user account
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Error deleting user account:', deleteError);
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
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
