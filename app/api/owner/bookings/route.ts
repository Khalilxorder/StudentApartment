import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const countOnly = searchParams.get('count') === 'true';
  const limit = Number(searchParams.get('limit') || '5');
  const sort = searchParams.get('sort') || 'created_at';

  try {
    let query = supabase
      .from('bookings')
      .select(
        `
          *,
          apartments(title),
          user_profiles(full_name, email)
        `,
        { count: 'exact' }
      )
      .eq('owner_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    if (sort) {
      query = query.order(sort, { ascending: false });
    }

    if (!countOnly) {
      query = query.limit(Number.isFinite(limit) && limit > 0 ? limit : 5);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    if (countOnly) {
      return NextResponse.json({ count: count ?? 0 });
    }

    return NextResponse.json({
      bookings: data ?? [],
      count: count ?? 0,
    });
  } catch (error) {
    logger.error({ error }, 'Owner bookings API error');
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 });
  }
}
