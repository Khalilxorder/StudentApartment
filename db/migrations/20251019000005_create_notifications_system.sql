-- Migration: Create notifications system
-- Date: 2025-10-19
-- Purpose: Complete notifications and communication system

-- ============================================
-- Notifications System Tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(type);
CREATE INDEX IF NOT EXISTS notifications_read_at_idx ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- Notification templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
  subject text,
  template text NOT NULL,
  variables jsonb DEFAULT '[]',
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification templates
CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- Indexes for notification templates
CREATE INDEX IF NOT EXISTS notification_templates_type_idx ON public.notification_templates(type);
CREATE INDEX IF NOT EXISTS notification_templates_active_idx ON public.notification_templates(active);

-- User notification preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  push_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  booking_updates boolean DEFAULT true,
  message_notifications boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  system_alerts boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user notification preferences
CREATE POLICY "Users can view their own notification preferences" ON public.user_notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON public.user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Scheduled notifications table
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES notification_templates(id) ON DELETE CASCADE,
  scheduled_for timestamp with time zone NOT NULL,
  data jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled notifications
CREATE POLICY "Users can view their own scheduled notifications" ON public.scheduled_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all scheduled notifications" ON public.scheduled_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- Indexes for scheduled notifications
CREATE INDEX IF NOT EXISTS scheduled_notifications_scheduled_for_idx ON public.scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS scheduled_notifications_status_idx ON public.scheduled_notifications(status);

-- ============================================
-- Default Notification Templates
-- ============================================

INSERT INTO public.notification_templates (name, type, subject, template, variables) VALUES
('booking_confirmed_student', 'email', 'Booking Confirmed - {{apartment_title}}', 'Dear {{student_name}},

Your booking for {{apartment_title}} has been confirmed!

Booking Details:
- Check-in: {{check_in_date}}
- Check-out: {{check_out_date}}
- Total Amount: {{total_amount}} HUF
- Owner: {{owner_name}}

Please contact {{owner_name}} at {{owner_email}} to coordinate check-in details.

Best regards,
Student Apartments Team', '["student_name", "apartment_title", "check_in_date", "check_out_date", "total_amount", "owner_name", "owner_email"]'),

('booking_confirmed_owner', 'email', 'New Booking - {{apartment_title}}', 'Dear {{owner_name}},

You have a new booking for {{apartment_title}}!

Booking Details:
- Student: {{student_name}}
- Check-in: {{check_in_date}}
- Check-out: {{check_out_date}}
- Total Amount: {{total_amount}} HUF

Please prepare the apartment for the student''s arrival.

Best regards,
Student Apartments Team', '["owner_name", "apartment_title", "student_name", "check_in_date", "check_out_date", "total_amount"]'),

('new_message', 'push', NULL, 'New message from {{sender_name}}: {{message_preview}}', '["sender_name", "message_preview"]'),

('booking_reminder', 'email', 'Booking Reminder - {{apartment_title}}', 'Dear {{student_name}},

This is a reminder that your booking for {{apartment_title}} is coming up in {{days_until_checkin}} days.

Check-in: {{check_in_date}}
Location: {{apartment_address}}

Please ensure you have all necessary documents and contact information ready.

Best regards,
Student Apartments Team', '["student_name", "apartment_title", "days_until_checkin", "check_in_date", "apartment_address"]'),

('payment_received', 'email', 'Payment Received - Thank You!', 'Dear {{customer_name}},

We have successfully received your payment of {{amount}} HUF for {{description}}.

Transaction ID: {{transaction_id}}
Date: {{payment_date}}

Thank you for using Student Apartments!

Best regards,
Student Apartments Team', '["customer_name", "amount", "description", "transaction_id", "payment_date"]'),

('welcome_student', 'email', 'Welcome to Student Apartments!', 'Dear {{student_name}},

Welcome to Student Apartments! We''re excited to help you find the perfect place to stay in Budapest.

Your account has been created successfully. Here are some tips to get started:
- Complete your profile to get better matches
- Set your preferences for location, budget, and amenities
- Browse available apartments in your preferred districts

If you have any questions, feel free to contact our support team.

Best regards,
Student Apartments Team', '["student_name"]'),

('welcome_owner', 'email', 'Welcome to Student Apartments - Start Listing!', 'Dear {{owner_name}},

Welcome to Student Apartments! Thank you for joining our platform to help students find great places to stay.

To get started:
1. Complete your profile and verification
2. Add your first apartment listing
3. Set your availability and pricing
4. Start receiving booking inquiries

Our team is here to help you succeed. Contact us if you need assistance.

Best regards,
Student Apartments Team', '["owner_name"]')

ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for notification templates
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for user notification preferences
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.notifications IS 'User notifications (email, SMS, push, in-app)';
COMMENT ON TABLE public.notification_templates IS 'Reusable notification templates with variables';
COMMENT ON TABLE public.user_notification_preferences IS 'User preferences for different notification types';
COMMENT ON TABLE public.scheduled_notifications IS 'Scheduled notifications for future delivery';
