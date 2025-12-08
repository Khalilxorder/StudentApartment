import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const getPeriodStart = (period: string) => {
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(now.setDate(diff));
  }
  // default month
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get('period') || 'month';
  const startDate = getPeriodStart(period);

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('total_amount, status, created_at')
      .eq('owner_id', user.id)
      .eq('status', 'approved')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const revenue = (data || []).reduce((sum, row: any) => sum + (row.total_amount || 0), 0);
    const paymentCount = data?.length ?? 0;

    return NextResponse.json({
      revenue,
      paymentCount,
      period,
      startDate: startDate.toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Owner revenue API error:');
    return NextResponse.json({ error: 'Failed to load revenue' }, { status: 500 });
  }
}
