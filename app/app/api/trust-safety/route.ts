import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, targetUserId, reason, content } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'report_user':
        return await handleUserReport(supabase, user.id, targetUserId, reason);
      case 'moderate_content':
        return await handleContentModeration(supabase, user.id, content);
      case 'flag_suspicious':
        return await handleSuspiciousActivity(supabase, user.id, targetUserId, reason);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Trust/Safety API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'trust_score':
        return await getTrustScore(supabase, user.id);
      case 'safety_check':
        return await performSafetyCheck(supabase, user.id);
      case 'reports':
        return await getUserReports(supabase, user.id);
      case 'assess_risk':
        return await assessUserRisk(supabase, user.id);
      case 'advanced_fraud_check':
        return await performAdvancedFraudCheck(supabase, user.id, request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Trust/Safety GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleUserReport(supabase: any, reporterId: string, targetUserId: string, reason: string) {
  if (!targetUserId || !reason) {
    return NextResponse.json({ error: 'Target user ID and reason are required' }, { status: 400 });
  }

  // Insert report
  const { error } = await supabase
    .from('user_reports')
    .insert({
      reporter_id: reporterId,
      target_user_id: targetUserId,
      reason: reason,
      status: 'pending',
      reported_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Report insertion error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  // Update user's trust score
  await updateTrustScore(supabase, targetUserId, -5); // Decrease trust score for being reported

  return NextResponse.json({ success: true, message: 'Report submitted successfully' });
}

async function handleContentModeration(supabase: any, userId: string, content: any) {
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  // Basic content moderation checks
  const moderationResult = await moderateContent(content);

  if (moderationResult.flagged) {
    // Log moderated content
    await supabase
      .from('content_moderation')
      .insert({
        user_id: userId,
        content_type: content.type || 'text',
        content: content.text || content,
        moderation_result: moderationResult,
        moderated_at: new Date().toISOString(),
      });

    return NextResponse.json({
      flagged: true,
      reason: moderationResult.reason,
      message: 'Content flagged for moderation'
    });
  }

  return NextResponse.json({ flagged: false, message: 'Content approved' });
}

async function handleSuspiciousActivity(supabase: any, reporterId: string, targetUserId: string, reason: string) {
  // Log suspicious activity
  const { error } = await supabase
    .from('suspicious_activity')
    .insert({
      reporter_id: reporterId,
      target_user_id: targetUserId,
      activity_type: 'suspicious_behavior',
      description: reason,
      flagged_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Suspicious activity logging error:', error);
    return NextResponse.json({ error: 'Failed to flag suspicious activity' }, { status: 500 });
  }

  // Decrease trust score
  await updateTrustScore(supabase, targetUserId, -10);

  return NextResponse.json({ success: true, message: 'Suspicious activity flagged' });
}

async function getTrustScore(supabase: any, userId: string) {
  // Calculate trust score based on various factors
  const trustScore = await calculateTrustScore(supabase, userId);

  return NextResponse.json({ trustScore });
}

async function performSafetyCheck(supabase: any, userId: string) {
  // Perform comprehensive safety check
  const safetyResult = await performComprehensiveSafetyCheck(supabase, userId);

  return NextResponse.json(safetyResult);
}

async function getUserReports(supabase: any, userId: string) {
  // Check if user is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type')
    .eq('user_id', userId)
    .single();

  if (profile?.user_type !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: reports, error } = await supabase
    .from('user_reports')
    .select(`
      *,
      reporter:user_profiles!user_reports_reporter_id_fkey(first_name, last_name),
      target:user_profiles!user_reports_target_user_id_fkey(first_name, last_name)
    `)
    .order('reported_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }

  return NextResponse.json({ reports: reports || [] });
}

async function moderateContent(content: any) {
  // Basic content moderation logic
  const text = content.text || content.toString().toLowerCase();

  // Check for inappropriate content
  const inappropriateWords = ['spam', 'scam', 'fraud', 'fake', 'illegal'];
  const flagged = inappropriateWords.some(word => text.includes(word));

  return {
    flagged,
    reason: flagged ? 'Contains potentially inappropriate content' : null,
    confidence: flagged ? 0.8 : 0.1
  };
}

async function calculateTrustScore(supabase: any, userId: string) {
  let score = 50; // Base score

  // Factor 1: Verification status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('identity_verified, background_check_completed, onboarding_completed')
    .eq('user_id', userId)
    .single();

  if (profile?.identity_verified) score += 20;
  if (profile?.background_check_completed) score += 15;
  if (profile?.onboarding_completed) score += 10;

  // Factor 2: Reports against user (negative)
  const { count: reportCount } = await supabase
    .from('user_reports')
    .select('*', { count: 'exact', head: true })
    .eq('target_user_id', userId);

  score -= (reportCount || 0) * 5;

  // Factor 3: Account age
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  if (user?.created_at) {
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    score += Math.min(daysOld / 30, 10); // Up to 10 points for accounts older than 30 days
  }

  // Factor 4: Successful transactions (would need booking history)
  // score += successfulBookings * 2;

  return Math.max(0, Math.min(100, score));
}

async function updateTrustScore(supabase: any, userId: string, change: number) {
  const currentScore = await calculateTrustScore(supabase, userId);
  const newScore = Math.max(0, Math.min(100, currentScore + change));

  // Store trust score history
  await supabase
    .from('trust_scores')
    .insert({
      user_id: userId,
      score: newScore,
      change_reason: change > 0 ? 'positive_action' : 'negative_action',
      change_amount: change,
      calculated_at: new Date().toISOString(),
    });
}

async function performComprehensiveSafetyCheck(supabase: any, userId: string) {
  const checks = {
    identityVerified: false,
    backgroundCheck: false,
    noRecentReports: true,
    accountAge: 0,
    trustScore: 0,
    riskLevel: 'low'
  };

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('identity_verified, background_check_completed, created_at')
    .eq('user_id', userId)
    .single();

  checks.identityVerified = profile?.identity_verified || false;
  checks.backgroundCheck = profile?.background_check_completed || false;

  if (profile?.created_at) {
    checks.accountAge = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24));
  }

  // Check recent reports
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentReports } = await supabase
    .from('user_reports')
    .select('*', { count: 'exact', head: true })
    .eq('target_user_id', userId)
    .gte('reported_at', sevenDaysAgo);

  checks.noRecentReports = (recentReports || 0) === 0;

  // Calculate trust score
  checks.trustScore = await calculateTrustScore(supabase, userId);

  // Determine risk level
  if (checks.trustScore < 30 || !checks.noRecentReports) {
    checks.riskLevel = 'high';
  } else if (checks.trustScore < 60 || !checks.identityVerified) {
    checks.riskLevel = 'medium';
  }

  return checks;
}

async function assessUserRisk(supabase: any, userId: string) {
  const { TrustSafetyService } = await import('@/services/trust-safety-svc');
  const trustSafetyService = new TrustSafetyService();

  try {
    const riskAssessment = await trustSafetyService.calculateAdvancedTrustScore(userId);
    return NextResponse.json(riskAssessment);
  } catch (error) {
    console.error('Risk assessment error:', error);
    return NextResponse.json({ error: 'Failed to assess user risk' }, { status: 500 });
  }
}

async function performAdvancedFraudCheck(supabase: any, userId: string, req: NextRequest) {
  const { TrustSafetyService } = await import('@/services/trust-safety-svc');
  const trustSafetyService = new TrustSafetyService();

  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const activityData = {
      type: 'verification' as const,
      ipAddress: ip,
      userAgent,
      timestamp: new Date(),
      metadata: { userId },
    };

    const alerts = await trustSafetyService.detectAdvancedFraud(userId, activityData);

    return NextResponse.json({
      alerts: alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        description: alert.description,
        evidence: alert.evidence,
      })),
      riskDetected: alerts.some(alert => alert.severity === 'high' || alert.severity === 'critical'),
    });
  } catch (error) {
    console.error('Advanced fraud check error:', error);
    return NextResponse.json({ error: 'Failed to perform fraud check' }, { status: 500 });
  }
}