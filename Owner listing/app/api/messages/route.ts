import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { cache, cacheHelpers } from '@/lib/cache';

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
    const otherUserId = searchParams.get('otherUserId');

    if (conversationId) {
      // Get messages for a specific conversation
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          read,
          sender_id,
          receiver_id,
          sender:user_profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            avatar_url,
            user_type
          ),
          receiver:user_profiles!messages_receiver_id_fkey(
            first_name,
            last_name,
            avatar_url,
            user_type
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Messages fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
      }

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', user.id)
        .eq('read', false);

      return NextResponse.json({ messages: messages || [] });
    } else if (otherUserId) {
      // Get or create conversation between users
      const conversationId = [user.id, otherUserId].sort().join('_');

      // Check if conversation exists
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .limit(1);

      if (!existingMessages || existingMessages.length === 0) {
        // Create conversation record if it doesn't exist
        await supabase
          .from('conversations')
          .upsert({
            id: conversationId,
            participant1_id: user.id,
            participant2_id: otherUserId,
            last_message_at: new Date().toISOString(),
          });
      }

      // Get conversation messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          read,
          sender_id,
          receiver_id,
          sender:user_profiles!messages_sender_id_fkey(
            first_name,
            last_name,
            avatar_url,
            user_type
          ),
          receiver:user_profiles!messages_receiver_id_fkey(
            first_name,
            last_name,
            avatar_url,
            user_type
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Messages fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
      }

      return NextResponse.json({
        conversationId,
        messages: messages || []
      });
    } else {
      // Get all conversations for the user (with caching)
      const cacheKey = `conversations:user:${user.id}`;
      
      const transformedConversations = await cache.getOrSet(
        cacheKey,
        async () => {
          const { data: conversations, error } = await supabase
            .from('conversations')
            .select(`
              id,
              last_message_at,
              participant1_id,
              participant2_id,
              last_message:messages(
                content,
                created_at,
                sender_id
              ),
              participant1:user_profiles!conversations_participant1_id_fkey(
                first_name,
                last_name,
                avatar_url,
                user_type
              ),
              participant2:user_profiles!conversations_participant2_id_fkey(
                first_name,
                last_name,
                avatar_url,
                user_type
              )
            `)
            .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
            .order('last_message_at', { ascending: false });

          if (error) {
            throw new Error('Failed to fetch conversations');
          }

          // Transform data to include other participant info
          return conversations?.map(conv => {
            const isParticipant1 = conv.participant1_id === user.id;
            const otherParticipant = isParticipant1 ? conv.participant2 : conv.participant1;
            const otherUserId = isParticipant1 ? conv.participant2_id : conv.participant1_id;
            const lastMessage = conv.last_message?.[0];

            return {
              id: conv.id,
              otherUser: otherParticipant,
              otherUserId: otherUserId,
              lastMessage: lastMessage ? {
                content: lastMessage.content,
                created_at: lastMessage.created_at,
                sender_id: lastMessage.sender_id,
              } : null,
              lastMessageAt: conv.last_message_at,
              unreadCount: 0, // Will be calculated separately if needed
            };
          }) || [];
        },
        {
          ttl: 60, // Cache for 1 minute (messages change frequently)
          tags: [`user:${user.id}`, 'conversations'],
        }
      );

      return NextResponse.json({ conversations: transformedConversations });
    }

  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const { conversationId, receiverId, content } = await request.json();

    if (!conversationId || !receiverId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that the user is a participant in this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .single();

    if (!conversation ||
        (conversation.participant1_id !== user.id && conversation.participant2_id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized to send message in this conversation' }, { status: 403 });
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim(),
        read: false,
      })
      .select(`
        id,
        content,
        created_at,
        read,
        sender:user_profiles!messages_sender_id_fkey(
          first_name,
          last_name,
          avatar_url,
          user_type
        )
      `)
      .single();

    if (insertError) {
      console.error('Message insert error:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Invalidate conversation caches for both users
    await cache.invalidateByTag(`user:${user.id}`);
    await cache.invalidateByTag(`user:${receiverId}`);
    await cache.invalidateByTag('conversations');

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}