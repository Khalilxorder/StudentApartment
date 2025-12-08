# BullMQ Queue System

## Overview
BullMQ-based asynchronous job processing system for email delivery, search indexing, and media processing.

## Architecture

### Queues
1. **Email Queue** (`lib/queues/email-queue.ts`)
   - Transactional emails (welcome, booking confirmation, password reset)
   - Campaign emails with delivery tracking
   - 3 retry attempts with exponential backoff
   - Concurrency: 5 workers

2. **Search Queue** (`lib/queues/search-queue.ts`)
   - Meilisearch indexing for apartments
   - Single and bulk operations
   - Automatic batching (100 items/batch)
   - Concurrency: 3 workers

3. **Media Queue** (`lib/queues/media-queue.ts`)
   - Image processing (thumbnails, optimization, blurhash)
   - Avatar processing
   - Re-optimization of existing media
   - Concurrency: 2 workers (CPU intensive)

## Setup

### Prerequisites
```bash
# Install Redis (if not using Upstash)
docker run -d -p 6379:6379 redis:latest

# Or use Upstash Redis (recommended for production)
# Set environment variables:
# REDIS_HOST=your-upstash-host.upstash.io
# REDIS_PORT=6379
# REDIS_PASSWORD=your-password
```

### Environment Variables
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, leave empty for local Redis

# Email (Resend)
RESEND_API_KEY=re_...

# Search (Meilisearch)
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-key
```

### Start Workers
```bash
# Development
npm run workers

# Production (PM2)
pm2 start scripts/start-workers.ts --name "queue-workers"

# Docker
docker-compose up workers
```

## Usage

### Email Queue
```typescript
import { enqueueTransactionalEmail } from '@/lib/queues/email-queue';

// Send welcome email
await enqueueTransactionalEmail(
  'user@example.com',
  'welcome',
  { name: 'John Doe' }
);
```

### Search Queue
```typescript
import { enqueueIndexApartment, enqueueBulkIndex } from '@/lib/queues/search-queue';

// Index single apartment
await enqueueIndexApartment('apt-123');

// Bulk index
await enqueueBulkIndex(['apt-1', 'apt-2', 'apt-3']);
```

### Media Queue
```typescript
import { enqueueProcessApartmentImage } from '@/lib/queues/media-queue';

// Process uploaded image
await enqueueProcessApartmentImage(
  'apt-123',
  'https://cdn.example.com/original.jpg',
  'apartment-photo.jpg'
);
```

## Monitoring

### BullMQ Board (Dashboard)
```bash
# Install Bull Board
npm install @bull-board/api @bull-board/express

# Access at http://localhost:3000/admin/queues
```

### Redis CLI
```bash
# Check queue length
redis-cli LLEN bull:email:wait

# Monitor jobs
redis-cli MONITOR
```

### Health Check
```typescript
// GET /api/queues/health
{
  "email": { "waiting": 5, "active": 2, "completed": 1234 },
  "search": { "waiting": 0, "active": 1, "completed": 567 },
  "media": { "waiting": 3, "active": 1, "completed": 890 }
}
```

## Production Deployment

### Scaling Workers
```bash
# Run multiple worker instances
pm2 start scripts/start-workers.ts -i 3

# Scale specific queue
pm2 scale queue-workers 5
```

### Best Practices
1. **Separate workers by queue** for better resource allocation
2. **Use Upstash Redis** for serverless environments
3. **Monitor queue lengths** - alert if backlog > 1000
4. **Set job TTL** to prevent infinite retries
5. **Implement dead letter queue** for failed jobs

## Troubleshooting

### Jobs Not Processing
```bash
# Check Redis connection
redis-cli PING  # Should return "PONG"

# Check worker logs
pm2 logs queue-workers

# Restart workers
pm2 restart queue-workers
```

### High Memory Usage
- Reduce worker concurrency
- Enable job removal on complete
- Check for memory leaks in job processors

### Slow Processing
- Increase worker concurrency (if CPU allows)
- Scale horizontally (more worker instances)
- Optimize job processor code
