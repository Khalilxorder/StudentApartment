import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabaseClient';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use service client for admin analytics operations
    const adminSupabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const timeframe = searchParams.get('timeframe') || '30d';

    switch (metric) {
      case 'user_metrics':
        return await getUserMetrics(adminSupabase, timeframe);
      case 'booking_metrics':
        return await getBookingMetrics(adminSupabase, timeframe);
      case 'revenue_metrics':
        return await getRevenueMetrics(adminSupabase, timeframe);
      case 'safety_metrics':
        return await getSafetyMetrics(adminSupabase, timeframe);
      case 'engagement_metrics':
        return await getEngagementMetrics(adminSupabase, timeframe);
      default:
        return await getDashboardOverview(adminSupabase, timeframe);
    }

  } catch (error) {
    logger.error({ error }, 'Analytics API error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getDashboardOverview(supabase: any, timeframe: string) {
  const days = parseTimeframe(timeframe);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // User metrics
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  const { count: newUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate);

  const { count: verifiedUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('identity_verified', true);

  // Student vs Owner breakdown
  const { data: userTypes } = await supabase
    .from('user_profiles')
    .select('user_type')
    .in('user_type', ['student', 'owner']);

  const studentCount = userTypes?.filter((u: any) => u.user_type === 'student').length || 0;
  const ownerCount = userTypes?.filter((u: any) => u.user_type === 'owner').length || 0;

  // Safety metrics
  const { count: totalReports } = await supabase
    .from('user_reports')
    .select('*', { count: 'exact', head: true });

  const { count: recentReports } = await supabase
    .from('user_reports')
    .select('*', { count: 'exact', head: true })
    .gte('reported_at', startDate);

  // Engagement metrics (would need actual booking/message data)
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  const { count: recentMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate);

  return NextResponse.json({
    overview: {
      totalUsers,
      newUsers,
      verifiedUsers,
      studentCount,
      ownerCount,
      totalReports,
      recentReports,
      totalMessages,
      recentMessages,
    },
    timeframe,
  });
}

async function getUserMetrics(supabase: any, timeframe: string) {
  const days = parseTimeframe(timeframe);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // User registration trends
  const { data: userTrends } = await supabase
    .rpc('get_user_registration_trends', { days });

  // User type distribution
  const { data: userTypeDist } = await supabase
    .from('user_profiles')
    .select('user_type')
    .in('user_type', ['student', 'owner']);

  const typeDistribution = {
    student: userTypeDist?.filter((u: any) => u.user_type === 'student').length || 0,
    owner: userTypeDist?.filter((u: any) => u.user_type === 'owner').length || 0,
  };

  // Verification rates
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  const { count: verifiedUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('identity_verified', true);

  const verificationRate = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

  return NextResponse.json({
    userTrends: userTrends || [],
    typeDistribution,
    verificationRate,
    totalUsers,
    verifiedUsers,
  });
}

async function getBookingMetrics(supabase: any, timeframe: string) {
  // Placeholder for booking metrics - would need actual booking table
  const days = parseTimeframe(timeframe);

  return NextResponse.json({
    totalBookings: 0,
    newBookings: 0,
    bookingValue: 0,
    averageBookingValue: 0,
    bookingTrends: [],
    conversionRate: 0,
  });
}

async function getRevenueMetrics(supabase: any, timeframe: string) {
  // Placeholder for revenue metrics - would need payment/transaction tables
  const days = parseTimeframe(timeframe);

  return NextResponse.json({
    totalRevenue: 0,
    monthlyRecurringRevenue: 0,
    averageRevenuePerUser: 0,
    revenueTrends: [],
    topRevenueSources: [],
  });
}

async function getSafetyMetrics(supabase: any, timeframe: string) {
  const days = parseTimeframe(timeframe);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Report metrics
  const { count: totalReports } = await supabase
    .from('user_reports')
    .select('*', { count: 'exact', head: true });

  const { count: recentReports } = await supabase
    .from('user_reports')
    .select('*', { count: 'exact', head: true })
    .gte('reported_at', startDate);

  const { data: reportTrends } = await supabase
    .rpc('get_report_trends', { days });

  // Trust score distribution
  const { data: trustScores } = await supabase
    .from('trust_scores')
    .select('score')
    .order('calculated_at', { ascending: false });

  const scoreDistribution = {
    excellent: trustScores?.filter((s: any) => s.score >= 80).length || 0,
    good: trustScores?.filter((s: any) => s.score >= 60 && s.score < 80).length || 0,
    fair: trustScores?.filter((s: any) => s.score >= 40 && s.score < 60).length || 0,
    low: trustScores?.filter((s: any) => s.score < 40).length || 0,
  };

  // Verification completion rates
  const { data: verificationStats } = await supabase
    .from('user_profiles')
    .select('identity_verified, background_check_completed');

  const verificationCompletion = {
    identity: verificationStats?.filter((u: any) => u.identity_verified).length || 0,
    background: verificationStats?.filter((u: any) => u.background_check_completed).length || 0,
  };

  return NextResponse.json({
    totalReports,
    recentReports,
    reportTrends: reportTrends || [],
    scoreDistribution,
    verificationCompletion,
  });
}

async function getEngagementMetrics(supabase: any, timeframe: string) {
  const days = parseTimeframe(timeframe);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Message metrics
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });

  const { count: recentMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate);

  // Conversation metrics
  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });

  const { count: activeConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('last_message_at', startDate);

  // Average messages per conversation
  const avgMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0;

  return NextResponse.json({
    totalMessages,
    recentMessages,
    totalConversations,
    activeConversations,
    avgMessagesPerConversation,
  });
}

function parseTimeframe(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([hdwm])$/);
  if (!match) return 30;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'h': return value / 24;
    case 'd': return value;
    case 'w': return value * 7;
    case 'm': return value * 30;
    default: return 30;
  }
}