import { logger } from '@/lib/dev-logger';

// FILE: app/api/marketing/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { emailCampaigns, EmailRecipient } from '@/lib/email-campaigns';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = params.id;
    const campaign = emailCampaigns.getCampaign(campaignId);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get recipients based on campaign segment
    const recipients = await getRecipientsForSegment(campaign.segment, supabase);

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found for this segment' }, { status: 400 });
    }

    // Send the campaign
    await emailCampaigns.sendCampaign(campaignId, recipients);

    return NextResponse.json({ success: true, recipientCount: recipients.length });
  } catch (error) {
    logger.error({ err: error }, 'Error sending campaign:');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getRecipientsForSegment(segment: string, supabase: any): Promise<EmailRecipient[]> {
  let query = supabase.from('profiles').select('id, email, first_name, last_name');

  // Filter based on segment
  switch (segment) {
    case 'active_users':
      // Users who have logged in within the last 30 days
      query = query.gte('last_sign_in_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      break;
    case 'inactive_users':
      // Users who haven't logged in for 90+ days
      query = query.lt('last_sign_in_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      break;
    case 'new_users':
      // Users who signed up within the last 7 days
      query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      break;
    case 'premium_users':
      // Users with premium subscriptions (assuming you have a subscription table)
      query = query.eq('subscription_status', 'premium');
      break;
    case 'all':
    default:
      // All users with email
      break;
  }

  const { data: users, error } = await query;

  if (error) {
    logger.error({ err: error }, 'Error fetching recipients:');
    return [];
  }

  return users.map((user: any) => ({
    email: user.email,
    userId: user.id,
    variables: {
      firstName: user.first_name || 'Student',
      searchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/search`,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`,
    },
    status: 'pending' as const,
  }));
}