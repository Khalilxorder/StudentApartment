import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST /api/saved-searches/send-alerts - Manually trigger alert sending (for testing)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user (admin only for manual triggering)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin (simplified check)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Send alerts
    const result = await sendSavedSearchAlerts();

    return NextResponse.json(result);

  } catch (error) {
    console.error('Send alerts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Main function to send saved search alerts
async function sendSavedSearchAlerts() {
  const supabase = createClient();
  let totalAlertsSent = 0;
  let totalUsersNotified = 0;

  try {
    // Get all active saved searches that need alerts
    const { data: savedSearches, error: searchError } = await supabase
      .from('saved_searches')
      .select(`
        id,
        user_id,
        name,
        alert_frequency,
        last_alert_sent_at,
        email_alerts_enabled,
        profiles!saved_searches_user_id_fkey(email)
      `)
      .eq('is_active', true)
      .eq('email_alerts_enabled', true);

    if (searchError) {
      console.error('Error fetching saved searches for alerts:', searchError);
      return { success: false, error: searchError.message };
    }

    if (!savedSearches || savedSearches.length === 0) {
      return { success: true, alertsSent: 0, usersNotified: 0 };
    }

    // Group searches by user to batch emails
    const userSearches = savedSearches.reduce((acc, search) => {
      const userId = search.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          email: (search.profiles as any).email,
          searches: []
        };
      }
      acc[userId].searches.push(search);
      return acc;
    }, {} as Record<string, { email: string; searches: any[] }>);

    // Process each user's searches
    for (const [userId, userData] of Object.entries(userSearches)) {
      const { email, searches } = userData;

      // Filter searches that need alerts based on frequency
      const searchesNeedingAlerts = searches.filter(search => {
        const lastSent = search.last_alert_sent_at;
        const now = new Date();
        const hoursSinceLastAlert = lastSent
          ? (now.getTime() - new Date(lastSent).getTime()) / (1000 * 60 * 60)
          : 999; // Never sent

        switch (search.alert_frequency) {
          case 'immediate':
            return hoursSinceLastAlert >= 1; // At least 1 hour between alerts
          case 'daily':
            return hoursSinceLastAlert >= 24;
          case 'weekly':
            return hoursSinceLastAlert >= 168; // 7 * 24
          case 'monthly':
            return hoursSinceLastAlert >= 720; // 30 * 24
          default:
            return false;
        }
      });

      if (searchesNeedingAlerts.length === 0) {
        continue;
      }

      // Get new apartments for each search
      const alertData = [];
      for (const search of searchesNeedingAlerts) {
        const { data: newApartments } = await supabase
          .from('search_results')
          .select(`
            apartment_id,
            first_found_at,
            apartments (
              id,
              title,
              price,
              bedrooms,
              bathrooms,
              address,
              images
            )
          `)
          .eq('saved_search_id', search.id)
          .gt('first_found_at', search.last_alert_sent_at || '1900-01-01')
          .limit(10); // Max 10 apartments per search

        if (newApartments && newApartments.length > 0) {
          alertData.push({
            searchName: search.name,
            searchId: search.id,
            newApartments: newApartments.map(result => result.apartments).filter(Boolean).flat()
          });
        }
      }

      if (alertData.length === 0) {
        continue;
      }

      // Send email alert
      const emailResult = await sendAlertEmail(email, alertData);

      if (emailResult.success) {
        totalUsersNotified++;

        // Update last_alert_sent_at for each search
        for (const search of searchesNeedingAlerts) {
          await supabase
            .from('saved_searches')
            .update({ last_alert_sent_at: new Date().toISOString() })
            .eq('id', search.id);

          // Create alert record
          const newApartmentsCount = alertData
            .find(data => data.searchId === search.id)?.newApartments.length || 0;

          if (newApartmentsCount > 0) {
            await supabase
              .from('search_alerts')
              .insert({
                saved_search_id: search.id,
                user_id: userId,
                subject: `New apartments matching "${search.name}"`,
                content: `We found ${newApartmentsCount} new apartments matching your saved search "${search.name}".`,
                new_apartments_count: newApartmentsCount,
                apartment_ids: alertData
                  .find(data => data.searchId === search.id)?.newApartments
                  .flat()
                  .map((apt: any) => apt.id) || []
              });

            totalAlertsSent++;
          }
        }
      }
    }

    return {
      success: true,
      alertsSent: totalAlertsSent,
      usersNotified: totalUsersNotified
    };

  } catch (error) {
    console.error('Error sending saved search alerts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send alert email using Resend
async function sendAlertEmail(email: string, alertData: any[]) {
  if (!resend) {
    console.warn('Resend API key not configured, skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const totalNewApartments = alertData.reduce((sum, data) => sum + data.newApartments.length, 0);

    const emailHtml = generateAlertEmailHtml(alertData);

    const result = await resend.emails.send({
      from: 'Student Apartments <alerts@studentapartments.com>',
      to: email,
      subject: `New Apartments Found - ${totalNewApartments} matches`,
      html: emailHtml
    });

    return { success: true, emailId: result.data?.id };

  } catch (error) {
    console.error('Error sending alert email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Generate HTML email content
function generateAlertEmailHtml(alertData: any[]): string {
  const totalApartments = alertData.reduce((sum, data) => sum + data.newApartments.length, 0);

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Apartments Found</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .search-section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .apartment-card { margin: 10px 0; padding: 15px; background: #f9fafb; border-radius: 6px; }
        .apartment-title { font-weight: bold; color: #1f2937; }
        .apartment-details { color: #6b7280; font-size: 14px; }
        .price { font-weight: bold; color: #059669; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏠 New Apartments Found!</h1>
          <p>We found ${totalApartments} new apartment${totalApartments === 1 ? '' : 's'} matching your saved searches.</p>
        </div>

        <div style="padding: 20px;">
  `;

  alertData.forEach(searchData => {
    html += `
      <div class="search-section">
        <h2>Saved Search: ${searchData.searchName}</h2>
        <p>We found ${searchData.newApartments.length} new apartment${searchData.newApartments.length === 1 ? '' : 's'} matching this search.</p>

        ${searchData.newApartments.map((apartment: any) => `
          <div class="apartment-card">
            <div class="apartment-title">${apartment.title}</div>
            <div class="apartment-details">
              ${apartment.address}<br>
              ${apartment.bedrooms} bed${apartment.bedrooms === 1 ? '' : 's'} •
              ${apartment.bathrooms} bath${apartment.bathrooms === 1 ? '' : 's'} •
              <span class="price">$${apartment.price}/month</span>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/apartments/${apartment.id}" class="button">View Apartment</a>
          </div>
        `).join('')}
      </div>
    `;
  });

  html += `
        </div>

        <div class="footer">
          <p>
            You're receiving this email because you have saved searches enabled.<br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/saved-searches">Manage your saved searches</a> |
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts">View all alerts</a>
          </p>
          <p>
            Student Apartments<br>
            ${new Date().getFullYear()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}