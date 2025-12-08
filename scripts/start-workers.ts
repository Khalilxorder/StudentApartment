#!/usr/bin/env tsx
/**
 * Queue Worker Startup Script
 * Starts all BullMQ workers for processing background jobs
 */

import { logger } from '../lib/dev-logger';

async function startWorkers() {
    logger.info('🚀 Starting BullMQ workers...');

    try {
        // Import all queue workers (this starts them automatically)
        await import('../lib/queues/email-queue');
        logger.info('✅ Email worker started');

        await import('../lib/queues/search-queue');
        logger.info('✅ Search worker started');

        await import('../lib/queues/media-queue');
        logger.info('✅ Media worker started');

        logger.info('✨ All workers started successfully');
        logger.info('📊 Workers ready to process jobs from Redis');

        // Keep process alive
        process.on('SIGTERM', () => {
            logger.info('Received SIGTERM, shutting down gracefully...');
            process.exit(0);
        });

        process.on('SIGINT', () => {
            logger.info('Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });

    } catch (error) {
        logger.error({ err: error }, 'Failed to start workers');
        process.exit(1);
    }
}

startWorkers();
