import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { Resend } from 'resend';

// Initialize Resend for email notifications
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface NotificationData {
  user_id: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  template_name?: string;
  template_data?: Record<string, any>;
  scheduled_for?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: NotificationData = await request.json();

    if (!data.user_id || !data.type || !data.title || !data.message) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, type, title, message' },
        { status: 400 }
      );
    }

    // Check user notification preferences
    const { data: preferences } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', data.user_id)
      .single();

    // Check if this type of notification is enabled
    const typeEnabled = getPreferenceForType(data.type, preferences);
    if (!typeEnabled) {
      return NextResponse.json({ message: 'Notification type disabled by user preferences' });
    }

    let finalTitle = data.title;
    let finalMessage = data.message;

    // If template is specified, render it
    if (data.template_name && data.template_data) {
      const template = await getNotificationTemplate(data.template_name, data.type);
      if (template) {
        finalTitle = renderTemplate(template.subject || data.title, data.template_data);
        finalMessage = renderTemplate(template.template, data.template_data);
      }
    }

    // Handle scheduled notifications
    if (data.scheduled_for) {
      const scheduledTime = new Date(data.scheduled_for);
      if (scheduledTime > new Date()) {
        // Schedule for later
        const { error } = await supabase
          .from('scheduled_notifications')
          .insert({
            user_id: data.user_id,
            template_id: data.template_name ? await getTemplateId(data.template_name) : null,
            scheduled_for: scheduledTime.toISOString(),
            data: data.template_data || {},
          });

        if (error) {
          console.error('Error scheduling notification:', error);
          return NextResponse.json({ error: 'Failed to schedule notification' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Notification scheduled successfully' });
      }
    }

    // Send notification immediately
    const success = await sendNotification(data.user_id, data.type, finalTitle, finalMessage, data.template_data);

    if (success) {
      // Log the notification
      await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          type: data.type,
          title: finalTitle,
          message: finalMessage,
          data: data.template_data || {},
          sent_at: new Date().toISOString(),
        });

      return NextResponse.json({ message: 'Notification sent successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'user_id parameter required' }, { status: 400 });
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data: notifications, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error in notifications GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { notification_ids, action } = await request.json();

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json({ error: 'notification_ids array required' }, { status: 400 });
    }

    if (action === 'mark_read') {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', notification_ids);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Notifications marked as read' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in notifications PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getNotificationTemplate(templateName: string, type: string) {
  const { data: template } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('name', templateName)
    .eq('type', type)
    .eq('active', true)
    .single();

  return template;
}

async function getTemplateId(templateName: string): Promise<string | null> {
  const { data: template } = await supabase
    .from('notification_templates')
    .select('id')
    .eq('name', templateName)
    .single();

  return template?.id || null;
}

function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
  }
  return rendered;
}

function getPreferenceForType(type: string, preferences: any): boolean {
  if (!preferences) return true; // Default to enabled if no preferences set

  switch (type) {
    case 'email':
      return preferences.email_enabled !== false;
    case 'sms':
      return preferences.sms_enabled === true;
    case 'push':
      return preferences.push_enabled !== false;
    case 'in_app':
      return preferences.in_app_enabled !== false;
    default:
      return true;
  }
}

async function sendNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    // Get user contact information
    const { data: user } = await supabase
      .from('user_profiles')
      .select('email, phone')
      .eq('user_id', userId)
      .single();

    if (!user) {
      console.error('User not found for notification');
      return false;
    }

    switch (type) {
      case 'email':
        if (user.email) {
          await sendEmailNotification(user.email, title, message);
        }
        break;

      case 'sms':
        if (user.phone) {
          await sendSMSNotification(user.phone, message);
        }
        break;

      case 'push':
        await sendPushNotification(userId, title, message, data);
        break;

      case 'in_app':
        // In-app notifications are already stored in the database
        break;

      default:
        console.error('Unknown notification type:', type);
        return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

async function sendEmailNotification(email: string, subject: string, message: string) {
  if (!resend) {
    console.warn('Resend not configured, skipping email notification');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Student Apartments <noreply@studentapartments.com>',
      to: email,
      subject,
      html: message.replace(/\n/g, '<br>'),
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

async function sendSMSNotification(phone: string, message: string) {
  // In a real implementation, you would integrate with an SMS service like Twilio
  console.log(`SMS to ${phone}: ${message}`);
  // For now, just log the SMS
}

async function sendPushNotification(userId: string, title: string, message: string, data?: Record<string, any>) {
  // In a real implementation, you would integrate with push notification services
  // like Firebase Cloud Messaging, OneSignal, etc.
  console.log(`Push notification to ${userId}: ${title} - ${message}`);

  // For web push notifications, you might store device tokens and send through a service
}