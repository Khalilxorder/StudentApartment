// FILE: app/api/marketing/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { emailCampaigns } from '@/lib/email-campaigns';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real app, you'd check if user is admin
    const campaigns = Array.from(emailCampaigns['campaigns'].values()).map(campaign => ({
      ...campaign,
      stats: emailCampaigns.getCampaignStats(campaign.id),
    }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, templateId, segment, scheduledAt } = body;

    if (!name || !templateId || !segment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const campaignId = await emailCampaigns.createCampaign({
      name,
      templateId,
      segment: segment as any,
      recipientCount: 0, // Will be updated when sending
    });

    if (scheduledAt) {
      await emailCampaigns.scheduleCampaign(campaignId, new Date(scheduledAt));
    }

    return NextResponse.json({ campaignId });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}