// Notification Service - Multi-channel notification system
// Handles email, push notifications, SMS, and in-app notifications

export interface NotificationTemplate {
  id: string;
  subject: string;
  body: string;
  channels: ('email' | 'push' | 'sms' | 'in-app')[];
  variables: string[];
}

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
}

export interface NotificationPayload {
  templateId: string;
  recipient: NotificationRecipient;
  variables: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
}

export class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  async sendNotification(payload: NotificationPayload): Promise<NotificationResult[]> {
    const template = this.templates.get(payload.templateId);
    if (!template) {
      throw new Error(`Template ${payload.templateId} not found`);
    }

    const results: NotificationResult[] = [];
    const enabledChannels = this.getEnabledChannels(payload.recipient, template.channels);

    for (const channel of enabledChannels) {
      try {
        const result = await this.sendToChannel(channel, payload, template);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          channel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async sendBulkNotifications(
    payloads: NotificationPayload[],
    batchSize: number = 50
  ): Promise<NotificationResult[][]> {
    const results: NotificationResult[][] = [];

    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(payload => this.sendNotification(payload))
      );
      results.push(...batchResults);

      // Rate limiting
      if (i + batchSize < payloads.length) {
        await this.delay(1000); // 1 second between batches
      }
    }

    return results;
  }

  private async sendToChannel(
    channel: string,
    payload: NotificationPayload,
    template: NotificationTemplate
  ): Promise<NotificationResult> {
    const content = this.renderTemplate(template, payload.variables);

    switch (channel) {
      case 'email':
        return this.sendEmail(payload.recipient, content, payload.priority);

      case 'push':
        return this.sendPushNotification(payload.recipient, content, payload.priority);

      case 'sms':
        return this.sendSMS(payload.recipient, content, payload.priority);

      case 'in-app':
        return this.sendInAppNotification(payload.recipient, content, payload.priority);

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  private async sendEmail(
    recipient: NotificationRecipient,
    content: { subject: string; body: string },
    priority: string
  ): Promise<NotificationResult> {
    if (!recipient.email) {
      return { success: false, channel: 'email', error: 'No email address' };
    }

    try {
      // Import email queue service dynamically
      const { emailQueue } = await import('./email-queue');

      // Queue email for asynchronous sending
      const job = await emailQueue.addEmailJob({
        to: recipient.email,
        subject: content.subject,
        html: content.body,
        tags: [
          { name: 'priority', value: priority },
          { name: 'template', value: 'notification' },
        ],
      });

      return { success: true, channel: 'email', messageId: `job_${job.id}` };
    } catch (error) {
      return {
        success: false,
        channel: 'email',
        error: error instanceof Error ? error.message : 'Queue error',
      };
    }
  }

  private async sendPushNotification(
    recipient: NotificationRecipient,
    content: { subject: string; body: string },
    priority: string
  ): Promise<NotificationResult> {
    if (!recipient.pushToken) {
      return { success: false, channel: 'push', error: 'No push token' };
    }

    try {
      // Integration with push service (e.g., Firebase, OneSignal)
      // Placeholder implementation
      console.log(`Sending push to ${recipient.pushToken}: ${content.subject}`);

      return { success: true, channel: 'push', messageId: `push_${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        channel: 'push',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendSMS(
    recipient: NotificationRecipient,
    content: { subject: string; body: string },
    priority: string
  ): Promise<NotificationResult> {
    if (!recipient.phone) {
      return { success: false, channel: 'sms', error: 'No phone number' };
    }

    try {
      // Integration with SMS service (e.g., Twilio, AWS SNS)
      // Placeholder implementation
      console.log(`Sending SMS to ${recipient.phone}: ${content.body.substring(0, 100)}...`);

      return { success: true, channel: 'sms', messageId: `sms_${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        channel: 'sms',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async sendInAppNotification(
    recipient: NotificationRecipient,
    content: { subject: string; body: string },
    priority: string
  ): Promise<NotificationResult> {
    try {
      // Store in database for in-app delivery
      // This would typically use Supabase or similar
      console.log(`Storing in-app notification for ${recipient.userId}: ${content.subject}`);

      return { success: true, channel: 'in-app', messageId: `inapp_${Date.now()}` };
    } catch (error) {
      return {
        success: false,
        channel: 'in-app',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getEnabledChannels(
    recipient: NotificationRecipient,
    availableChannels: string[]
  ): string[] {
    return availableChannels.filter(channel => {
      switch (channel) {
        case 'email':
          return recipient.preferences.email && recipient.email;
        case 'push':
          return recipient.preferences.push && recipient.pushToken;
        case 'sms':
          return recipient.preferences.sms && recipient.phone;
        case 'in-app':
          return recipient.preferences.inApp;
        default:
          return false;
      }
    });
  }

  private renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>
  ): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
      body = body.replace(regex, String(value));
    }

    return { subject, body };
  }

  private initializeTemplates() {
    // Apartment match notifications
    this.templates.set('apartment_match', {
      id: 'apartment_match',
      subject: 'New apartment matches your search!',
      body: `
        <h2>Great news, {{userName}}!</h2>
        <p>We found {{matchCount}} new apartments that match your search for {{searchCriteria}}.</p>
        <p>Check them out now: <a href="{{searchUrl}}">View matches</a></p>
        <p>Happy hunting!</p>
        <p>Student Apartments Team</p>
      `,
      channels: ['email', 'push', 'in-app'],
      variables: ['userName', 'matchCount', 'searchCriteria', 'searchUrl'],
    });

    // Price drop alerts
    this.templates.set('price_drop', {
      id: 'price_drop',
      subject: 'Price drop on saved apartment!',
      body: `
        <h2>Price Alert</h2>
        <p>The apartment you saved at {{address}} now costs {{newPrice}} (was {{oldPrice}}).</p>
        <p>Don't miss out: <a href="{{apartmentUrl}}">View apartment</a></p>
      `,
      channels: ['email', 'push', 'in-app'],
      variables: ['address', 'newPrice', 'oldPrice', 'apartmentUrl'],
    });

    // Message notifications
    this.templates.set('new_message', {
      id: 'new_message',
      subject: 'New message from {{senderName}}',
      body: `
        <p>You have a new message from {{senderName}} about the apartment at {{address}}.</p>
        <p><a href="{{messagesUrl}}">Reply now</a></p>
      `,
      channels: ['push', 'in-app'],
      variables: ['senderName', 'address', 'messagesUrl'],
    });

    // Verification reminders
    this.templates.set('verification_reminder', {
      id: 'verification_reminder',
      subject: 'Complete your verification to unlock features',
      body: `
        <h2>Complete Your Profile</h2>
        <p>Verify your {{university}} student status to access premium features and build trust with owners.</p>
        <p><a href="{{verificationUrl}}">Verify now</a></p>
      `,
      channels: ['email', 'in-app'],
      variables: ['university', 'verificationUrl'],
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const notificationService = new NotificationService();