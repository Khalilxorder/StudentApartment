import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function GET() {
  try {
    // Get all user profiles with their verification and trust data
    const { data: users, error } = await getSupabaseClient()`n      .from('user_profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        email,
        user_type,
        identity_verified,
        background_check_completed,
        onboarding_completed,
        created_at,
        trust_scores (
          trust_score
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Transform the data to include trust scores
    const transformedUsers = users?.map((user: any) => ({
      ...user,
      trust_score: user.trust_scores?.[0]?.trust_score || null,
    })) || [];

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, updates } = await request.json();

    if (!userId || !updates) {
      return NextResponse.json({ error: 'Missing userId or updates' }, { status: 400 });
    }

    // Update user profile
    const { error: profileError } = await getSupabaseClient()`n      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating user profile:', profileError);
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    // If identity verification status changed, log it
    if (updates.identity_verified !== undefined) {
      await getSupabaseClient()`n        .from('audit_logs')
        .insert({
          user_id: userId,
          action: updates.identity_verified ? 'identity_verified' : 'identity_unverified',
          details: { admin_action: true },
          created_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin users PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}