/**
 * Search Queue - BullMQ implementation for Meilisearch indexing
 * Handles async search index updates with batching
 */

import { Queue, Worker, Job } from 'bullmq';
import { logger } from '@/lib/dev-logger';

const REDIS_CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
};

// Search job types
export interface IndexApartmentJob {
    type: 'index-apartment';
    apartmentId: string;
}

export interface DeleteApartmentJob {
    type: 'delete-apartment';
    apartmentId: string;
}

export interface BulkIndexJob {
    type: 'bulk-index';
    apartmentIds: string[];
}

export type SearchJob = IndexApartmentJob | DeleteApartmentJob | BulkIndexJob;

// Create search queue
export const searchQueue = new Queue<SearchJob>('search', {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 3600, // 1 hour
            count: 500,
        },
        removeOnFail: {
            age: 24 * 3600, // 24 hours
        },
    },
});

// Search worker
const searchWorker = new Worker<SearchJob>(
    'search',
    async (job: Job<SearchJob>) => {
        const { data } = job;

        try {
            logger.info(
                { jobId: job.id, type: data.type },
                'Processing search indexing job'
            );

            if (data.type === 'index-apartment') {
                await indexApartment(data.apartmentId);
            } else if (data.type === 'delete-apartment') {
                await deleteFromIndex(data.apartmentId);
            } else if (data.type === 'bulk-index') {
                await bulkIndexApartments(data.apartmentIds);
            }

            logger.info({ jobId: job.id }, 'Search index updated');
            return { success: true };
        } catch (error) {
            logger.error(
                { err: error, jobId: job.id },
                'Search indexing failed'
            );
            throw error;
        }
    },
    {
        connection: REDIS_CONNECTION,
        concurrency: 3,
    }
);

// Index single apartment
async function indexApartment(apartmentId: string) {
    const { MeiliSearch } = await import('meilisearch');

    const client = new MeiliSearch({
        host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
        apiKey: process.env.MEILISEARCH_API_KEY,
    });

    // Fetch apartment data (simplified - would need actual DB query)
    const apartment = await fetchApartmentData(apartmentId);

    const index = client.index('apartments');
    await index.addDocuments([apartment], { primaryKey: 'id' });
}

// Delete from index
async function deleteFromIndex(apartmentId: string) {
    const { MeiliSearch } = await import('meilisearch');

    const client = new MeiliSearch({
        host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
        apiKey: process.env.MEILISEARCH_API_KEY,
    });

    const index = client.index('apartments');
    await index.deleteDocument(apartmentId);
}

// Bulk index apartments
async function bulkIndexApartments(apartmentIds: string[]) {
    const { MeiliSearch } = await import('meilisearch');

    const client = new MeiliSearch({
        host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
        apiKey: process.env.MEILISEARCH_API_KEY,
    });

    // Fetch all apartments in batch
    const apartments = await Promise.all(
        apartmentIds.map(id => fetchApartmentData(id))
    );

    const index = client.index('apartments');
    await index.addDocuments(apartments, { primaryKey: 'id' });
}

// Helper to fetch apartment data from DB
async function fetchApartmentData(apartmentId: string) {
    const { createClient } = await import('@supabase/supabase-js');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', apartmentId)
        .single();

    if (error) {
        throw new Error(`Failed to fetch apartment ${apartmentId}: ${error.message}`);
    }

    return data;
}

// Worker event handlers
searchWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Search indexing job completed');
});

searchWorker.on('failed', (job, err) => {
    logger.error(
        { jobId: job?.id, err },
        'Search indexing job failed'
    );
});

// Helper functions for enqueueing jobs
export async function enqueueIndexApartment(apartmentId: string) {
    return searchQueue.add('index-apartment', {
        type: 'index-apartment',
        apartmentId,
    });
}

export async function enqueueDeleteApartment(apartmentId: string) {
    return searchQueue.add('delete-apartment', {
        type: 'delete-apartment',
        apartmentId,
    });
}

export async function enqueueBulkIndex(apartmentIds: string[]) {
    // Batch into chunks of 100
    const chunks = [];
    for (let i = 0; i < apartmentIds.length; i += 100) {
        chunks.push(apartmentIds.slice(i, i + 100));
    }

    return Promise.all(
        chunks.map(chunk =>
            searchQueue.add('bulk-index', {
                type: 'bulk-index',
                apartmentIds: chunk,
            })
        )
    );
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await searchWorker.close();
    await searchQueue.close();
});

export default searchQueue;
