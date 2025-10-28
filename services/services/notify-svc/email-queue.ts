// Email Queue Service using BullMQ
// Handles asynchronous email sending with Redis/Upstash

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { Resend } from 'resend';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  from?: string;
  tags?: Array<{ name: string; value: string }>;
  retryCount?: number;
}

export class EmailQueueService {
  private queue: Queue;
  private worker: Worker;
  private resend: Resend | null;

  constructor() {
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    let connection;
    if (redisUrl && redisToken) {
      // Upstash Redis
      connection = {
        host: redisUrl.replace('https://', '').replace('http://', '').split('.')[0],
        password: redisToken,
        port: 6379,
        tls: {},
      };
    } else if (redisUrl) {
      // Standard Redis
      const redis = new IORedis(redisUrl);
      connection = redis;
    } else {
      // Fallback to local Redis
      connection = {
        host: 'localhost',
        port: 6379,
      };
    }

    // Initialize queue
    this.queue = new Queue('email-queue', {
      connection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    // Initialize Resend
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;

    // Initialize worker
    this.worker = new Worker('email-queue', this.processEmailJob.bind(this), {
      connection,
      concurrency: 5, // Process up to 5 emails simultaneously
    });

    // Worker event handlers
    this.worker.on('completed', (job) => {
      console.log(`✅ Email job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Email job ${job?.id} failed:`, err);
    });

    console.log('📧 Email queue service initialized');
  }

  async addEmailJob(data: EmailJobData, options?: { delay?: number; priority?: number }) {
    const jobData = {
      ...data,
      retryCount: data.retryCount || 0,
    };

    const jobOptions = {
      delay: options?.delay || 0,
      priority: options?.priority || 0,
    };

    const job = await this.queue.add('send-email', jobData, jobOptions);
    console.log(`📧 Email job queued: ${job.id} to ${data.to}`);
    return job;
  }

  async addBulkEmails(emails: EmailJobData[], batchSize: number = 10) {
    const jobs = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchJobs = await this.queue.addBulk(
        batch.map(email => ({
          name: 'send-email',
          data: { ...email, retryCount: email.retryCount || 0 },
        }))
      );
      jobs.push(...batchJobs);

      // Small delay between batches to avoid overwhelming Redis
      if (i + batchSize < emails.length) {
        await this.delay(100);
      }
    }

    console.log(`📧 Bulk email jobs queued: ${jobs.length} emails`);
    return jobs;
  }

  private async processEmailJob(job: any) {
    const { to, subject, html, from, tags, retryCount } = job.data;

    if (!this.resend) {
      throw new Error('Resend not configured');
    }

    try {
      const result = await this.resend.emails.send({
        from: from || 'Student Apartments <noreply@studentapartments.com>',
        to,
        subject,
        html,
        tags: tags || [{ name: 'source', value: 'queue' }],
      });

      console.log(`📧 Email sent successfully: ${result.data?.id} to ${to}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);

      // If this is a retry and we've exceeded max attempts, don't retry
      if (retryCount >= 2) {
        throw new Error(`Email failed after ${retryCount + 1} attempts: ${error}`);
      }

      // Add retry job with incremented count
      await this.addEmailJob(
        { ...job.data, retryCount: retryCount + 1 },
        { delay: Math.pow(2, retryCount) * 60000 } // Exponential backoff in minutes
      );

      throw error;
    }
  }

  async getQueueStats() {
    const waiting = await this.queue.getWaiting();
    const active = await this.queue.getActive();
    const completed = await this.queue.getCompleted();
    const failed = await this.queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  async close() {
    await this.worker.close();
    await this.queue.close();
    console.log('📧 Email queue service closed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const emailQueue = new EmailQueueService();