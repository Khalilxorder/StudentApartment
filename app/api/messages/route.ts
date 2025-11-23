import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cache, cacheHelpers } from '@/lib/cache';
import { rateLimiter } from '@/lib/rate-limit';
import { maskContactInfo } from '@/lib/messaging';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (unreadOnly) {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Unread count error:', error);
        return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 });
      }

      return NextResponse.json({ count: count ?? 0 });
    }

    if (conversationId) {
      // Get messages for a specific conversation
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          read_at,
          sender_id,
          message_type,
          metadata
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Messages fetch error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch messages', details: error.message },
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Mark unread messages as read
      const now = new Date().toISOString();
      await supabase
        .from('messages')
        .update({ read_at: now })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id) // Don't mark own messages as read
        .is('read_at', null);

      return NextResponse.json(
        { messages: messages || [] },
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // Get all conversations for the user
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          apartment_id,
          student_id,
          owner_id,
          status,
          last_message_at,
          last_message_preview,
          unread_count_student,
          unread_count_owner,
          created_at,
          apartment:apartments(
            id,
            title,
            address,
            monthly_rent_huf
          )
        `)
        .or(`student_id.eq.${user.id},owner_id.eq.${user.id}`)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Conversations fetch error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch conversations', details: error.message },
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get other participant info for each conversation
      const conversationsWithParticipants = await Promise.all(
        (conversations || []).map(async (conv: any) => {
          const isStudent = conv.student_id === user.id;
          const otherUserId = isStudent ? conv.owner_id : conv.student_id;
          const otherUserRole = isStudent ? 'owner' : 'student';

          // Get other user's profile with first_name, last_name, avatar_url
          const tableName = otherUserRole === 'owner' ? 'profiles_owner' : 'profiles_student';
          const { data: profile } = await supabase
            .from(tableName)
            .select('full_name, phone, email')
            .eq('id', otherUserId)
            .maybeSingle();

          // Split full_name into first and last name
          const nameParts = (profile?.full_name || 'Unknown User').split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || 'User';

          return {
            id: conv.id,
            apartmentId: conv.apartment_id,
            apartment: conv.apartment,
            otherUserId,
            otherUserRole,
            otherUser: {
              first_name: firstName,
              last_name: lastName,
              avatar_url: null, // Can be extended if avatar URLs are stored
              user_type: otherUserRole,
            },
            lastMessage: conv.last_message_preview ? {
              content: conv.last_message_preview,
              created_at: conv.last_message_at,
              sender_id: null, // We don't track this in the preview
            } : null,
            lastMessageAt: conv.last_message_at,
            unreadCount: isStudent ? conv.unread_count_student : conv.unread_count_owner,
            status: conv.status,
            createdAt: conv.created_at,
          };
        })
      );

      return NextResponse.json(
        { conversations: conversationsWithParticipants },
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 50 messages per hour per user (increased from 5)
    const rateLimitResult = await rateLimiter.check(user.id, '/api/messages', 50, 60 * 60 * 1000);

    if (!rateLimitResult.success) {
      return NextResponse.json({
        error: 'Rate limit exceeded. You can send up to 50 messages per hour.',
        retryAfter: Math.ceil(rateLimitResult.reset / 1000)
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(rateLimitResult.reset / 1000).toString()
        }
      });
    }

    const { conversationId, receiverId, content, apartmentId } = await request.json();

    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let finalConversationId = conversationId;

    // If no conversationId provided, we need apartmentId to create a new conversation
    if (!conversationId) {
      if (!apartmentId) {
        return NextResponse.json({ error: 'apartmentId required to start new conversation' }, { status: 400 });
      }

      // Get apartment owner to determine student/owner roles
      const { data: apartment } = await supabase
        .from('apartments')
        .select('owner_id')
        .eq('id', apartmentId)
        .single();

      if (!apartment) {
        return NextResponse.json({ error: 'Apartment not found' }, { status: 404 });
      }

      // Determine student_id and owner_id
      const isUserOwner = apartment.owner_id === user.id;
      const studentId = isUserOwner ? receiverId : user.id;
      const ownerId = isUserOwner ? user.id : receiverId;

      // Create or get existing conversation using the new RPC function
      const { data: newConversationId, error: convError } = await supabase
        .rpc('get_or_create_conversation_v2', {
          p_apartment_id: apartmentId,
          p_student_id: studentId,
          p_owner_id: ownerId
        });

      if (convError || !newConversationId) {
        console.error('Conversation creation error:', convError);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

      finalConversationId = newConversationId;
    }

    if (!finalConversationId) {
      return NextResponse.json({ error: 'Invalid conversation' }, { status: 400 });
    }

    // Validate that the user is a participant in this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('student_id, owner_id')
      .eq('id', finalConversationId)
      .single();

    if (!conversation ||
      (conversation.student_id !== user.id && conversation.owner_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized to send message in this conversation' }, { status: 403 });
    }

    // Determine receiver_id for the message
    const messageReceiverId = conversation.student_id === user.id ? conversation.owner_id : conversation.student_id;

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: finalConversationId,
        sender_id: user.id,
        receiver_id: messageReceiverId,
        content: maskContactInfo(content.trim()),
      })
      .select(`
        id,
        content,
        created_at,
        sender_id,
        receiver_id
      `)
      .single();

    if (insertError) {
      console.error('Message insert error:', insertError);
      return NextResponse.json({ error: 'Failed to send message', details: insertError.message }, { status: 500 });
    }

    // Invalidate conversation caches for both users
    await cache.invalidateByTag(`user:${user.id}`);
    await cache.invalidateByTag(`user:${messageReceiverId}`);
    await cache.invalidateByTag('conversations');

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
