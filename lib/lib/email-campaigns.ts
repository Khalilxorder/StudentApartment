// FILE: lib/email-campaigns.ts
import { Resend } from 'resend';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables: string[];
}

interface Campaign {
  id: string;
  name: string;
  templateId: string;
  segment: 'all' | 'active_users' | 'inactive_users' | 'new_users' | 'premium_users';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduledAt?: Date;
  sentAt?: Date;
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
}

interface EmailRecipient {
  email: string;
  userId?: string;
  variables: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
}

class EmailCampaignService {
  private resend: Resend;
  private templates: Map<string, EmailTemplate> = new Map();
  private campaigns: Map<string, Campaign> = new Map();

  constructor(apiKey?: string) {
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      // Mock implementation for build time
      this.resend = { emails: { send: async () => ({ id: 'mock' }) } } as any;
    }
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Welcome email template
    this.templates.set('welcome', {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to Student Apartments - Find Your Perfect Home!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Student Apartments!</h1>
          <p>Hi {{firstName}},</p>
          <p>Thank you for joining Student Apartments! We're excited to help you find the perfect student accommodation.</p>
          <p>Here's what you can do to get started:</p>
          <ul>
            <li><a href="{{searchUrl}}">Search for apartments</a> in your preferred location</li>
            <li>Save your favorite listings</li>
            <li>Set up notifications for new properties</li>
            <li>Complete your profile for personalized recommendations</li>
          </ul>
          <p>Need help? Our support team is here for you.</p>
          <a href="{{dashboardUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
          <p>Best regards,<br>The Student Apartments Team</p>
        </div>
      `,
      variables: ['firstName', 'searchUrl', 'dashboardUrl']
    });

    // Property alert template
    this.templates.set('property_alert', {
      id: 'property_alert',
      name: 'New Properties Alert',
      subject: 'New student apartments matching your criteria!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Properties Found!</h1>
          <p>Hi {{firstName}},</p>
          <p>We found {{propertyCount}} new student apartments that match your search criteria:</p>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3>{{propertyTitle}}</h3>
            <p><strong>Location:</strong> {{propertyLocation}}</p>
            <p><strong>Price:</strong> {{propertyPrice}} per month</p>
            <p><strong>Available:</strong> {{availabilityDate}}</p>
            <a href="{{propertyUrl}}" style="background-color: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 8px;">View Property</a>
          </div>
          <p><a href="{{searchUrl}}">View all matching properties</a></p>
          <p>You can <a href="{{unsubscribeUrl}}">unsubscribe</a> from these alerts anytime.</p>
        </div>
      `,
      variables: ['firstName', 'propertyCount', 'propertyTitle', 'propertyLocation', 'propertyPrice', 'availabilityDate', 'propertyUrl', 'searchUrl', 'unsubscribeUrl']
    });

    // Newsletter template
    this.templates.set('newsletter', {
      id: 'newsletter',
      name: 'Monthly Newsletter',
      subject: 'Student Apartments Newsletter - {{month}} {{year}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Student Apartments Newsletter</h1>
          <p>Hi {{firstName}},</p>
          <p>Here's what's new in the world of student housing this month:</p>

          <h2>🏠 Featured Properties</h2>
          {{featuredProperties}}

          <h2>📊 Market Insights</h2>
          <p>{{marketInsights}}</p>

          <h2>💡 Tips & Advice</h2>
          <p>{{tipsAndAdvice}}</p>

          <h2>🎯 Student Success Stories</h2>
          <p>{{successStories}}</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="{{searchUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Find Your Apartment</a>
          </div>

          <p>You can <a href="{{unsubscribeUrl}}">unsubscribe</a> from our newsletter anytime.</p>
        </div>
      `,
      variables: ['firstName', 'month', 'year', 'featuredProperties', 'marketInsights', 'tipsAndAdvice', 'successStories', 'searchUrl', 'unsubscribeUrl']
    });

    // Promotional template
    this.templates.set('promotion', {
      id: 'promotion',
      name: 'Special Promotion',
      subject: '{{promotionTitle}} - Limited Time Offer!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
            <h1>{{promotionTitle}}</h1>
            <p style="font-size: 18px; margin: 16px 0;">{{promotionDescription}}</p>
            <div style="background: rgba(255,255,255,0.2); padding: 16px; border-radius: 6px; margin: 16px 0;">
              <p style="font-size: 24px; font-weight: bold; margin: 0;">{{discountCode}}</p>
              <p style="margin: 4px 0 0 0;">Use this code at checkout</p>
            </div>
          </div>

          <p>Hi {{firstName}},</p>
          <p>{{personalMessage}}</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="{{promotionUrl}}" style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 18px; font-weight: bold;">Claim Your Discount</a>
          </div>

          <p style="font-size: 12px; color: #6b7280;">Offer valid until {{expirationDate}}. Terms and conditions apply.</p>
          <p>You can <a href="{{unsubscribeUrl}}">unsubscribe</a> from promotional emails anytime.</p>
        </div>
      `,
      variables: ['promotionTitle', 'promotionDescription', 'discountCode', 'firstName', 'personalMessage', 'promotionUrl', 'expirationDate', 'unsubscribeUrl']
    });
  }

  // Template management
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  // Campaign management
  async createCampaign(campaignData: Omit<Campaign, 'id' | 'status' | 'sentAt'>): Promise<string> {
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const campaign: Campaign = {
      ...campaignData,
      id: campaignId,
      status: 'draft',
    };

    this.campaigns.set(campaignId, campaign);
    return campaignId;
  }

  getCampaign(campaignId: string): Campaign | undefined {
    return this.campaigns.get(campaignId);
  }

  async scheduleCampaign(campaignId: string, scheduledAt: Date): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    campaign.status = 'scheduled';
    campaign.scheduledAt = scheduledAt;
    this.campaigns.set(campaignId, campaign);
  }

  async cancelCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    campaign.status = 'cancelled';
    this.campaigns.set(campaignId, campaign);
  }

  // Email sending
  async sendCampaign(campaignId: string, recipients: EmailRecipient[]): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const template = this.templates.get(campaign.templateId);
    if (!template) throw new Error('Template not found');

    campaign.status = 'sending';
    campaign.recipientCount = recipients.length;
    this.campaigns.set(campaignId, campaign);

    try {
      // Send emails in batches to avoid rate limits
      const batchSize = 50;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        await Promise.all(
          batch.map(recipient => this.sendEmail(template, recipient))
        );
      }

      campaign.status = 'sent';
      campaign.sentAt = new Date();
      this.campaigns.set(campaignId, campaign);
    } catch (error) {
      campaign.status = 'cancelled';
      this.campaigns.set(campaignId, campaign);
      throw error;
    }
  }

  private async sendEmail(template: EmailTemplate, recipient: EmailRecipient): Promise<void> {
    // Replace variables in subject and content
    let subject = template.subject;
    let html = template.html;
    let text = template.text;

    Object.entries(recipient.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
      html = html.replace(regex, String(value));
      if (text) text = text.replace(regex, String(value));
    });

    try {
      await this.resend.emails.send({
        from: 'Student Apartments <noreply@studentapartments.com>',
        to: recipient.email,
        subject,
        html,
        text,
        tags: [
          { name: 'campaign_type', value: template.id },
          { name: 'user_id', value: recipient.userId || 'anonymous' },
        ],
      });

      recipient.status = 'sent';
    } catch (error) {
      console.error('Failed to send email to', recipient.email, error);
      recipient.status = 'bounced';
    }
  }

  // Analytics and reporting
  getCampaignStats(campaignId: string): {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    clickRate: number;
  } | undefined {
    // In a real implementation, this would fetch data from Resend or your analytics service
    // For now, return mock data
    return {
      sent: 1000,
      delivered: 950,
      opened: 380,
      clicked: 95,
      bounced: 50,
      openRate: 38,
      clickRate: 9.5,
    };
  }

  // Automated campaigns
  async triggerWelcomeEmail(userEmail: string, userData: Record<string, any>): Promise<void> {
    const recipients: EmailRecipient[] = [{
      email: userEmail,
      userId: userData.id,
      variables: {
        firstName: userData.firstName || 'Student',
        searchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/search`,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
      status: 'pending',
    }];

    const campaignId = await this.createCampaign({
      name: `Welcome Email - ${userData.firstName}`,
      templateId: 'welcome',
      segment: 'new_users',
      recipientCount: 1,
    });

    await this.sendCampaign(campaignId, recipients);
  }

  async triggerPropertyAlert(userEmail: string, userData: Record<string, any>, properties: any[]): Promise<void> {
    if (properties.length === 0) return;

    const topProperty = properties[0];
    const recipients: EmailRecipient[] = [{
      email: userEmail,
      userId: userData.id,
      variables: {
        firstName: userData.firstName || 'Student',
        propertyCount: properties.length,
        propertyTitle: topProperty.title,
        propertyLocation: topProperty.location,
        propertyPrice: topProperty.price,
        availabilityDate: topProperty.availableDate,
        propertyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/apartments/${topProperty.id}`,
        searchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/search`,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(userEmail)}`,
      },
      status: 'pending',
    }];

    const campaignId = await this.createCampaign({
      name: `Property Alert - ${userData.firstName}`,
      templateId: 'property_alert',
      segment: 'active_users',
      recipientCount: 1,
    });

    await this.sendCampaign(campaignId, recipients);
  }
}

// Create singleton instance
export const emailCampaigns = new EmailCampaignService(process.env.RESEND_API_KEY);

// Export types
export type { EmailTemplate, Campaign, EmailRecipient };