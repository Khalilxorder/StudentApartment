/**
 * Media Queue - BullMQ implementation for image processing
 * Handles async thumbnail generation, optimization, and blurhash creation
 */

import { Queue, Worker, Job } from 'bullmq';
import { mediaService } from '@/services/media-svc';
import { logger } from '@/lib/dev-logger';

const REDIS_CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
};

// Media job types
export interface ProcessApartmentImageJob {
    type: 'process-apartment-image';
    apartmentId: string;
    imageUrl: string;
    filename: string;
}

export interface ProcessAvatarJob {
    type: 'process-avatar';
    userId: string;
    imageUrl: string;
}

export interface OptimizeExistingJob {
    type: 'optimize-existing';
    mediaId: string;
}

export type MediaJob = ProcessApartmentImageJob | ProcessAvatarJob | OptimizeExistingJob;

// Create media queue
export const mediaQueue = new Queue<MediaJob>('media', {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 5000,
        },
        removeOnComplete: {
            age: 3600, // 1 hour
            count: 200,
        },
        removeOnFail: {
            age: 24 * 3600, // 24 hours
        },
    },
});

// Media worker
const mediaWorker = new Worker<MediaJob>(
    'media',
    async (job: Job<MediaJob>) => {
        const { data } = job;

        try {
            logger.info(
                { jobId: job.id, type: data.type },
                'Processing media job'
            );

            if (data.type === 'process-apartment-image') {
                await processApartmentImage(data);
            } else if (data.type === 'process-avatar') {
                await processAvatar(data);
            } else if (data.type === 'optimize-existing') {
                await optimizeExisting(data.mediaId);
            }

            logger.info({ jobId: job.id }, 'Media processing completed');
            return { success: true };
        } catch (error) {
            logger.error(
                { err: error, jobId: job.id },
                'Media processing failed'
            );
            throw error;
        }
    },
    {
        connection: REDIS_CONNECTION,
        concurrency: 2, // Limit concurrent image processing (CPU intensive)
    }
);

// Process apartment image
async function processApartmentImage(job: ProcessApartmentImageJob) {
    // Fetch image from URL
    const response = await fetch(job.imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Process with media service
    const result = await mediaService.processApartmentImage(buffer, job.filename);

    // Store metadata in database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
        .from('apartment_media')
        .insert({
            apartment_id: job.apartmentId,
            original_url: result.original,
            thumbnail_url: result.thumbnail,
            optimized_url: result.optimized,
            blurhash: result.blurhash,
            width: result.metadata.width,
            height: result.metadata.height,
            size_bytes: result.metadata.size,
            format: result.metadata.format,
        });
}

// Process user avatar
async function processAvatar(job: ProcessAvatarJob) {
    const response = await fetch(job.imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch avatar: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Process with media service
    const result = await mediaService.processUserAvatar(buffer, job.userId);

    // Update user profile
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
        .from('profiles')
        .update({
            avatar_url: result.original,
            avatar_thumbnail: result.thumbnail,
            avatar_blurhash: result.blurhash,
        })
        .eq('id', job.userId);
}

// Optimize existing media
async function optimizeExisting(mediaId: string) {
    // Fetch existing media record
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: media, error } = await supabase
        .from('apartment_media')
        .select('*')
        .eq('id', mediaId)
        .single();

    if (error || !media) {
        throw new Error(`Media ${mediaId} not found`);
    }

    // Re-fetch and re-process
    const response = await fetch(media.original_url);
    if (!response.ok) {
        throw new Error('Failed to fetch original image');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const result = await mediaService.processApartmentImage(buffer, `${mediaId}.jpg`);

    // Update record
    await supabase
        .from('apartment_media')
        .update({
            optimized_url: result.optimized,
            thumbnail_url: result.thumbnail,
            blurhash: result.blurhash,
        })
        .eq('id', mediaId);
}

// Worker event handlers
mediaWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Media job completed');
});

mediaWorker.on('failed', (job, err) => {
    logger.error(
        { jobId: job?.id, err },
        'Media job failed'
    );
});

// Helper functions for enqueueing jobs
export async function enqueueProcessApartmentImage(
    apartmentId: string,
    imageUrl: string,
    filename: string
) {
    return mediaQueue.add('process-apartment-image', {
        type: 'process-apartment-image',
        apartmentId,
        imageUrl,
        filename,
    });
}

export async function enqueueProcessAvatar(userId: string, imageUrl: string) {
    return mediaQueue.add('process-avatar', {
        type: 'process-avatar',
        userId,
        imageUrl,
    });
}

export async function enqueueOptimizeExisting(mediaId: string) {
    return mediaQueue.add('optimize-existing', {
        type: 'optimize-existing',
        mediaId,
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await mediaWorker.close();
    await mediaQueue.close();
});

export default mediaQueue;
