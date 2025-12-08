// Email Queue Service using BullMQ
// Handles asynchronous email sending with Redis/Upstash

import { Resend } from 'resend';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  from?: string;
  tags?: Array<{ name: string; value: string }>;
  retryCount?: number;
}

class EmailQueueService {
  private queue: any = null;
  private worker: any = null;
  private resend: Resend | null;
  private initialized = false;

  constructor() {
    // Don't initialize in constructor - lazy initialize on first use
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
  }

  private async initialize() {
    if (this.initialized) return;

    // Skip during build time or in browser
    if (typeof window !== 'undefined') {
      this.initialized = true;
      return;
    }

    try {
      // Skip initialization during build (no REDIS_URL set)
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!redisUrl && !redisToken) {
        console.warn('⚠️ No Redis URL configured, email queue disabled');
        this.initialized = true;
        return;
      }

      // Dynamic imports to prevent build-time bundling
      const { Queue } = await import('bullmq');
      const IORedis = (await import('ioredis')).default;

      let connection: any;
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
        const redis = new IORedis(redisUrl, {
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 50, 2000);
          }
        });
        redis.on('error', (err: Error) => {
          console.warn('Redis connection error in EmailQueue:', err.message);
        });
        connection = redis;
      }

      if (connection) {
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
        console.log('📧 Email queue service initialized');
      }

      this.initialized = true;
    } catch (error) {
      console.warn('⚠️ Failed to initialize EmailQueueService:', error);
      this.queue = null;
      this.worker = null;
      this.initialized = true;
    }
  }

  async addEmailJob(data: EmailJobData, options?: { delay?: number; priority?: number }) {
    await this.initialize();

    if (!this.queue) {
      console.warn('⚠️ EmailQueueService not initialized, skipping email job');
      return null;
    }

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
    await this.initialize();

    if (!this.queue) {
      console.warn('⚠️ EmailQueueService not initialized, skipping bulk emails');
      return [];
    }

    const jobs = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchJobs = await this.queue.addBulk(
        batch.map((email: EmailJobData) => ({
          name: 'send-email',
          data: { ...email, retryCount: email.retryCount || 0 },
        }))
      );
      jobs.push(...batchJobs);

      if (i + batchSize < emails.length) {
        await this.delay(100);
      }
    }

    console.log(`📧 Bulk email jobs queued: ${jobs.length} emails`);
    return jobs;
  }

  async getQueueStats() {
    if (!this.queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }
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
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
    console.log('📧 Email queue service closed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export lazy-loaded singleton - constructor doesn't connect to Redis
export const emailQueue = new EmailQueueService();
