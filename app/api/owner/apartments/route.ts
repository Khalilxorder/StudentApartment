import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') ?? '0');

  try {
    let query = supabase
      .from('apartments')
      .select('id', { count: 'exact', head: limit === 0 });

    query = query
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      count: count ?? 0,
      apartments: data ?? [],
    });
  } catch (error) {
    console.error('Owner apartments API error:', error);
    return NextResponse.json({ error: 'Failed to load apartments' }, { status: 500 });
  }
}
