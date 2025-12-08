/**
 * Email Queue - BullMQ implementation for transactional and campaign emails
 * Handles async email delivery with retry logic and rate limiting
 */

import { Queue, Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/dev-logger';

const REDIS_CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
};

// Email job types
export interface TransactionalEmailJob {
    type: 'transactional';
    to: string;
    template: string;
    data: Record<string, any>;
    from?: string;
}

export interface CampaignEmailJob {
    type: 'campaign';
    campaignId: string;
    recipientId: string;
    to: string;
    subject: string;
    html: string;
}

export type EmailJob = TransactionalEmailJob | CampaignEmailJob;

// Create email queue
export const emailQueue = new Queue<EmailJob>('email', {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    },
});

// Email worker
const emailWorker = new Worker<EmailJob>(
    'email',
    async (job: Job<EmailJob>) => {
        const { data } = job;

        try {
            logger.info(
                { jobId: job.id, type: data.type, to: data.to },
                'Processing email job'
            );

            if (data.type === 'transactional') {
                await sendTransactionalEmail(data);
            } else if (data.type === 'campaign') {
                await sendCampaignEmail(data);
            }

            logger.info({ jobId: job.id }, 'Email sent successfully');
            return { success: true };
        } catch (error) {
            logger.error(
                { err: error, jobId: job.id, type: data.type },
                'Email sending failed'
            );
            throw error;
        }
    },
    {
        connection: REDIS_CONNECTION,
        concurrency: 5, // Process 5 emails concurrently
    }
);

// Send transactional email via Resend
async function sendTransactionalEmail(job: TransactionalEmailJob) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured');
    }

    const templateMap: Record<string, { subject: string; html: (data: any) => string }> = {
        'welcome': {
            subject: 'Welcome to Student Apartments',
            html: (data) => `<h1>Welcome ${data.name}!</h1><p>Thanks for joining us.</p>`,
        },
        'booking-confirmation': {
            subject: 'Booking Confirmed',
            html: (data) => `<h1>Booking Confirmed</h1><p>Your booking #${data.bookingId} is confirmed.</p>`,
        },
        'password-reset': {
            subject: 'Reset Your Password',
            html: (data) => `<h1>Reset Password</h1><p>Click <a href="${data.resetUrl}">here</a> to reset your password.</p>`,
        },
    };

    const template = templateMap[job.template];
    if (!template) {
        throw new Error(`Unknown template: ${job.template}`);
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: job.from || 'noreply@studentapartments.com',
            to: job.to,
            subject: template.subject,
            html: template.html(job.data),
        }),
    });

    if (!response.ok) {
        throw new Error(`Resend API error: ${response.statusText}`);
    }
}

// Send campaign email
async function sendCampaignEmail(job: CampaignEmailJob) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'campaigns@studentapartments.com',
            to: job.to,
            subject: job.subject,
            html: job.html,
        }),
    });

    if (!response.ok) {
        throw new Error(`Resend API error: ${response.statusText}`);
    }

    // Track campaign delivery
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
        .from('campaign_deliveries')
        .insert({
            campaign_id: job.campaignId,
            recipient_id: job.recipientId,
            delivered_at: new Date().toISOString(),
            status: 'delivered',
        });
}

// Worker event handlers
emailWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Email job completed');
});

emailWorker.on('failed', (job, err) => {
    logger.error(
        { jobId: job?.id, err },
        'Email job failed after all retries'
    );
});

// Helper functions for enqueueing jobs
export async function enqueueTransactionalEmail(
    to: string,
    template: string,
    data: Record<string, any>
) {
    return emailQueue.add('transactional-email', {
        type: 'transactional',
        to,
        template,
        data,
    });
}

export async function enqueueCampaignEmail(
    campaignId: string,
    recipientId: string,
    to: string,
    subject: string,
    html: string
) {
    return emailQueue.add('campaign-email', {
        type: 'campaign',
        campaignId,
        recipientId,
        to,
        subject,
        html,
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await emailWorker.close();
    await emailQueue.close();
});

export default emailQueue;
