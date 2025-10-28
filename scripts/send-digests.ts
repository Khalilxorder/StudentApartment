/**
 * Digest Email Scheduler
 * Sends weekly digest emails to users with new apartments matching their saved searches
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

interface DigestRecipient {
  user_id: string;
  email: string;
  first_name: string;
  frequency: 'daily' | 'weekly' | 'never';
  last_sent_at: string | null;
  categories: string[];
  preferred_time: string;
}

interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  query: any;
  filters: any;
  created_at: string;
}

interface NewApartment {
  id: string;
  title: string;
  price: number;
  bedrooms: number;
  district: string;
  created_at: string;
  owner_id: string;
}

async function sendDigestEmails() {
  console.log('🚀 Starting digest email scheduler...');

  try {
    // 1. Get users who should receive digests today
    const recipients = await getDigestRecipients();
    console.log(`📧 Found ${recipients.length} users to send digests to`);

    // 2. For each recipient, generate and send digest
    for (const recipient of recipients) {
      try {
        await sendUserDigest(recipient);
        console.log(`✅ Sent digest to ${recipient.email}`);
      } catch (error) {
        console.error(`❌ Failed to send digest to ${recipient.email}:`, error);
      }
    }

    console.log('✨ Digest email scheduler completed');
  } catch (error) {
    console.error('💥 Digest scheduler failed:', error);
    process.exit(1);
  }
}

async function getDigestRecipients(): Promise<DigestRecipient[]> {
  // Get users with digest preferences set to weekly
  const { data, error } = await supabase
    .from('digest_preferences')
    .select(`
      user_id,
      frequency,
      categories,
      preferred_time,
      last_sent_at,
      user_profiles!inner(
        email,
        first_name
      )
    `)
    .eq('frequency', 'weekly')
    .eq('enabled', true);

  if (error) {
    throw new Error(`Failed to fetch digest recipients: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    user_id: row.user_id,
    email: row.user_profiles.email,
    first_name: row.user_profiles.first_name,
    frequency: row.frequency,
    last_sent_at: row.last_sent_at,
    categories: row.categories || ['new_listings', 'saved_searches'],
    preferred_time: row.preferred_time || '09:00',
  }));
}

async function sendUserDigest(recipient: DigestRecipient) {
  // 1. Get user's saved searches
  const savedSearches = await getUserSavedSearches(recipient.user_id);

  // 2. Find new apartments matching saved searches
  const newApartments = await getNewApartmentsForUser(recipient, savedSearches);

  // 3. Generate digest content
  const digestContent = generateDigestContent(recipient, newApartments, savedSearches);

  // 4. Send email
  await sendDigestEmail(recipient, digestContent);

  // 5. Record digest send
  await recordDigestSend(recipient, newApartments.length);
}

async function getUserSavedSearches(userId: string): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error(`Failed to fetch saved searches for user ${userId}:`, error);
    return [];
  }

  return data || [];
}

async function getNewApartmentsForUser(
  recipient: DigestRecipient,
  savedSearches: SavedSearch[]
): Promise<NewApartment[]> {
  const lastSentDate = recipient.last_sent_at
    ? new Date(recipient.last_sent_at)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago

  let allNewApartments: NewApartment[] = [];

  // For each saved search, find matching new apartments
  for (const search of savedSearches) {
    const apartments = await findApartmentsMatchingSearch(search, lastSentDate);
    allNewApartments = allNewApartments.concat(apartments);
  }

  // Remove duplicates and sort by creation date
  const uniqueApartments = allNewApartments
    .filter((apartment, index, self) =>
      index === self.findIndex(a => a.id === apartment.id)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10); // Limit to 10 apartments per digest

  return uniqueApartments;
}

async function findApartmentsMatchingSearch(
  search: SavedSearch,
  sinceDate: Date
): Promise<NewApartment[]> {
  let query = supabase
    .from('apartments')
    .select('id, title, price, bedrooms, district, created_at, owner_id')
    .gte('created_at', sinceDate.toISOString())
    .eq('status', 'active');

  // Apply search filters
  if (search.filters) {
    const filters = search.filters;

    if (filters.min_price) query = query.gte('price', filters.min_price);
    if (filters.max_price) query = query.lte('price', filters.max_price);
    if (filters.bedrooms) query = query.eq('bedrooms', filters.bedrooms);
    if (filters.district) query = query.eq('district', filters.district);
    if (filters.min_area) query = query.gte('area_sqm', filters.min_area);
    if (filters.max_area) query = query.lte('area_sqm', filters.max_area);
  }

  const { data, error } = await query.limit(20);

  if (error) {
    console.error(`Failed to find apartments for search ${search.id}:`, error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    price: row.price,
    bedrooms: row.bedrooms,
    district: row.district,
    created_at: row.created_at,
    owner_id: row.owner_id,
  }));
}

function generateDigestContent(
  recipient: DigestRecipient,
  newApartments: NewApartment[],
  savedSearches: SavedSearch[]
): { subject: string; html: string; text: string } {
  const subject = `New apartments matching your searches - ${newApartments.length} found`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Weekly Apartment Digest</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">Your Weekly Apartment Digest</h1>

      <p>Hi ${recipient.first_name},</p>

      <p>We found <strong>${newApartments.length}</strong> new apartments that match your saved searches since your last digest.</p>

      ${newApartments.length > 0 ? `
        <h2>New Apartments</h2>
        ${newApartments.map(apartment => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0;">
              <a href="${process.env.NEXTAUTH_URL}/apartments/${apartment.id}" style="color: #2563eb; text-decoration: none;">
                ${apartment.title}
              </a>
            </h3>
            <p style="margin: 4px 0; color: #374151;">
              💰 ${apartment.price.toLocaleString()} HUF/month • 🏠 ${apartment.bedrooms} bedrooms • 📍 ${apartment.district}
            </p>
          </div>
        `).join('')}
      ` : ''}

      <h2>Your Saved Searches</h2>
      <p>You have ${savedSearches.length} active saved searches. You can manage them in your <a href="${process.env.NEXTAUTH_URL}/dashboard/saved-searches">dashboard</a>.</p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

      <p style="color: #6b7280; font-size: 14px;">
        You're receiving this because you have digest emails enabled.
        <a href="${process.env.NEXTAUTH_URL}/dashboard/digest-preferences">Manage preferences</a> |
        <a href="${process.env.NEXTAUTH_URL}/unsubscribe?user=${recipient.user_id}">Unsubscribe</a>
      </p>
    </body>
    </html>
  `;

  const text = `
    Your Weekly Apartment Digest

    Hi ${recipient.first_name},

    We found ${newApartments.length} new apartments that match your saved searches.

    ${newApartments.map(apartment =>
      `${apartment.title} - ${apartment.price.toLocaleString()} HUF - ${apartment.district}`
    ).join('\n')}

    View all: ${process.env.NEXTAUTH_URL}/dashboard

    Manage preferences: ${process.env.NEXTAUTH_URL}/dashboard/digest-preferences
    Unsubscribe: ${process.env.NEXTAUTH_URL}/unsubscribe?user=${recipient.user_id}
  `;

  return { subject, html, text };
}

async function sendDigestEmail(
  recipient: DigestRecipient,
  content: { subject: string; html: string; text: string }
) {
  // Import email queue service dynamically
  const { emailQueue } = await import('../services/notify-svc/email-queue');

  // Queue digest email for asynchronous sending
  const job = await emailQueue.addEmailJob({
    to: recipient.email,
    subject: content.subject,
    html: content.html,
    from: 'Student Apartments <digests@studentapartments.com>',
    tags: [
      { name: 'type', value: 'digest' },
      { name: 'frequency', value: recipient.frequency },
    ],
  });

  console.log(`📧 Digest email queued for ${recipient.email}: job ${job.id}`);
}

async function recordDigestSend(recipient: DigestRecipient, apartmentCount: number) {
  const { error } = await supabase
    .from('digest_sends')
    .insert({
      user_id: recipient.user_id,
      type: 'weekly',
      apartment_count: apartmentCount,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`Failed to record digest send for user ${recipient.user_id}:`, error);
  }

  // Update last_sent_at in preferences
  const { error: updateError } = await supabase
    .from('digest_preferences')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('user_id', recipient.user_id);

  if (updateError) {
    console.error(`Failed to update last_sent_at for user ${recipient.user_id}:`, updateError);
  }
}

// Run the scheduler
if (require.main === module) {
  sendDigestEmails()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Digest scheduler failed:', error);
      process.exit(1);
    });
}

export { sendDigestEmails };