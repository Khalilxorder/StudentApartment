import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { mediaService } from '@/services/media-svc';
import { createServiceClient } from '@/utils/supabaseClient';

export type MediaOptimizationPriority = 'high' | 'normal' | 'low';

export interface MediaOptimizationJobData {
  jobRecordId: string;
  mediaId: string;
  apartmentId?: string | null;
  sourceBucket?: string | null;
  sourcePath?: string | null;
  sourceUrl?: string | null;
  filename?: string | null;
  priority?: MediaOptimizationPriority;
}

class MediaOptimizationQueue {
  private queue: Queue<MediaOptimizationJobData> | null = null;
  private worker: Worker<MediaOptimizationJobData> | null = null;

  constructor() {
    try {
      const redisConnection = this.createRedisConnection();

      this.queue = new Queue<MediaOptimizationJobData>('media-optimization-queue', {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          removeOnComplete: 100,
          removeOnFail: 200,
          backoff: {
            type: 'exponential',
            delay: 10_000,
          },
        },
      });

      // Only initialize worker when running in a long-lived environment (e.g. background worker process).
      // Next.js API routes may be executed in serverless mode; guard to avoid spawning duplicate workers per request.
      if (!process.env.VERCEL || process.env.ENABLE_MEDIA_WORKER === 'true') {
        this.worker = new Worker(
          'media-optimization-queue',
          (job) => this.processJob(job),
          {
            connection: redisConnection,
            concurrency: 3,
          }
        );

        this.worker.on('completed', (job) => {
          console.log(`🎞️ Media optimization completed for job ${job.data.jobRecordId}`);
        });

        this.worker.on('failed', (job, err) => {
          console.error(`❌ Media optimization failed for job ${job?.data.jobRecordId}`, err);
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize MediaOptimizationQueue (likely build environment):', error);
      this.queue = null;
      this.worker = null;
    }
  }

  async addOptimizationJob(data: MediaOptimizationJobData) {
    if (!this.queue) {
      console.warn('⚠️ MediaOptimizationQueue not initialized, skipping job');
      return;
    }
    const priority = this.priorityToBullPriority(data.priority ?? 'normal');
    await this.queue.add('optimize-media', data, { priority });
  }

  async addOptimizationJobs(jobs: MediaOptimizationJobData[]) {
    if (!this.queue) {
      console.warn('⚠️ MediaOptimizationQueue not initialized, skipping jobs');
      return;
    }
    if (!jobs.length) return;
    await this.queue.addBulk(
      jobs.map((job) => ({
        name: 'optimize-media',
        data: job,
        opts: { priority: this.priorityToBullPriority(job.priority ?? 'normal') },
      }))
    );
  }

  private async processJob(job: Job<MediaOptimizationJobData>) {
    const supabase = createServiceClient();
    const { jobRecordId, mediaId, apartmentId, sourceBucket, sourcePath, sourceUrl, filename } = job.data;

    const startedAt = new Date().toISOString();
    await supabase
      .from('media_processing_jobs')
      .update({ status: 'processing', started_at: startedAt })
      .eq('id', jobRecordId);

    try {
      const buffer = await this.fetchOriginalBuffer({ sourceBucket, sourcePath, sourceUrl, mediaId });
      if (!buffer) {
        throw new Error('Unable to load original media buffer');
      }

      const apartmentRef = apartmentId ?? 'unassigned';
      const safeFilename = filename || `media-${mediaId}.webp`;

      const processed = await mediaService.processApartmentImage(buffer, safeFilename);

      const completedAt = new Date().toISOString();

      await Promise.all([
        supabase
          .from('media_processing_jobs')
          .update({
            status: 'completed',
            completed_at: completedAt,
            output_metadata: {
              optimized_url: processed.optimized,
              thumbnail_url: processed.thumbnail,
              blurhash: processed.blurhash,
              width: processed.metadata.width,
              height: processed.metadata.height,
              size: processed.metadata.size,
            },
            updated_at: completedAt,
          })
          .eq('id', jobRecordId),
        supabase
          .from('media_uploads')
          .update({
            optimized_url: processed.optimized,
            thumbnail_url: processed.thumbnail,
            blurhash: processed.blurhash,
            status: 'processed',
            processed_at: completedAt,
          })
          .eq('id', mediaId),
      ]);

      return processed;
    } catch (error) {
      console.error(`Media optimization job ${jobRecordId} failed`, error);
      await supabase
        .from('media_processing_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobRecordId);
      throw error;
    }
  }

  private async fetchOriginalBuffer({
    sourceBucket,
    sourcePath,
    sourceUrl,
    mediaId,
  }: {
    sourceBucket?: string | null;
    sourcePath?: string | null;
    sourceUrl?: string | null;
    mediaId: string;
  }): Promise<Buffer | null> {
    const supabase = createServiceClient();

    if (sourceBucket && sourcePath) {
      try {
        const { data, error } = await supabase.storage
          .from(sourceBucket)
          .download(sourcePath);
        if (error) throw error;
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        console.error(`Failed to download media from storage ${sourceBucket}/${sourcePath}`, error);
      }
    }

    if (sourceUrl) {
      try {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        console.error(`Failed to fetch media via URL (${sourceUrl}) for media ${mediaId}`, error);
      }
    }

    // As a last resort, pull the row again to see if additional metadata is available
    try {
      const { data, error } = await supabase
        .from('media_uploads')
        .select('storage_bucket, storage_path, original_url')
        .eq('id', mediaId)
        .single();

      if (!error && data) {
        return await this.fetchOriginalBuffer({
          sourceBucket: data.storage_bucket,
          sourcePath: data.storage_path,
          sourceUrl: data.original_url,
          mediaId,
        });
      }
    } catch (error) {
      console.error('Failed to re-fetch media metadata', error);
    }

    return null;
  }

  private priorityToBullPriority(priority: MediaOptimizationPriority): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'low':
        return 10;
      default:
        return 5;
    }
  }

  private createRedisConnection() {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      return {
        host: redisUrl.replace(/^https?:\/\//, '').split(':')[0],
        password: redisToken,
        port: 6379,
        tls: {},
      };
    }

    if (redisUrl) {
      const redis = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 50, 2000);
        }
      });
      redis.on('error', (err) => {
        console.warn('Redis connection error in MediaOptimizationQueue:', err.message);
      });
      return redis;
    }

    return {
      host: '127.0.0.1',
      port: 6379,
    };
  }
}

export const mediaOptimizationQueue = new MediaOptimizationQueue();
