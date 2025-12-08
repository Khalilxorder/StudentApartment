/**
 * Enhanced Health Check System
 * 
 * Comprehensive health monitoring for all services
 * Used by uptime monitors and load balancers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    redis?: CheckResult;
    search?: CheckResult;
    ai?: CheckResult;
    storage?: CheckResult;
  };
  metrics?: {
    memory: MemoryMetrics;
    requests: RequestMetrics;
  };
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  responseTime: number;
  message?: string;
}

interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
}

interface RequestMetrics {
  total: number;
  errors: number;
  errorRate: number;
}

let startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

/**
 * Main health check endpoint
 * GET /api/health
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const detailed = req.nextUrl.searchParams.get('detailed') === 'true';

  const checks: HealthStatus['checks'] = {
    database: await checkDatabase(),
  };

  // Optional checks (only in detailed mode)
  if (detailed) {
    checks.redis = await checkRedis();
    checks.search = await checkSearch();
    checks.ai = await checkAI();
    checks.storage = await checkStorage();
  }

  // Determine overall status
  const statuses = Object.values(checks).map(c => c?.status);
  const hasFail = statuses.includes('fail');
  const hasWarn = statuses.includes('warn');

  const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
    hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy';

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  // Add metrics in detailed mode
  if (detailed) {
    health.metrics = {
      memory: getMemoryMetrics(),
      requests: getRequestMetrics(),
    };
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${Date.now() - start}ms`,
    },
  });
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    const responseTime = Date.now() - start;

    if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
      return {
        status: 'fail',
        responseTime,
        message: 'Database query failed',
      };
    }

    if (responseTime > 1000) {
      return {
        status: 'warn',
        responseTime,
        message: 'Slow database response',
      };
    }

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();

  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      return {
        status: 'warn',
        responseTime: 0,
        message: 'Redis not configured',
      };
    }

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    await redis.ping();
    const responseTime = Date.now() - start;

    return {
      status: responseTime > 500 ? 'warn' : 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Redis connection failed',
    };
  }
}

/**
 * Check Meilisearch connectivity
 */
async function checkSearch(): Promise<CheckResult> {
  const start = Date.now();

  try {
    if (!process.env.MEILISEARCH_HOST) {
      return {
        status: 'warn',
        responseTime: 0,
        message: 'Search not configured',
      };
    }

    const { MeiliSearch } = await import('meilisearch');
    const client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST,
      apiKey: process.env.MEILISEARCH_MASTER_KEY,
    });

    await client.health();
    const responseTime = Date.now() - start;

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Search service unavailable',
    };
  }
}

/**
 * Check AI service availability
 */
async function checkAI(): Promise<CheckResult> {
  const start = Date.now();

  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return {
        status: 'warn',
        responseTime: 0,
        message: 'AI not configured',
      };
    }

    // Simple API key validation
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' +
      process.env.GOOGLE_AI_API_KEY,
      { signal: AbortSignal.timeout(5000) }
    );

    const responseTime = Date.now() - start;

    if (!response.ok) {
      return {
        status: 'fail',
        responseTime,
        message: 'AI API key invalid or quota exceeded',
      };
    }

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'AI service check failed',
    };
  }
}

/**
 * Check storage (Supabase Storage)
 */
async function checkStorage(): Promise<CheckResult> {
  const start = Date.now();

  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage.listBuckets();

    const responseTime = Date.now() - start;

    if (error) {
      return {
        status: 'fail',
        responseTime,
        message: 'Storage unavailable',
      };
    }

    return {
      status: 'pass',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      message: 'Storage check failed',
    };
  }
}

/**
 * Get memory metrics
 */
function getMemoryMetrics(): MemoryMetrics {
  const usage = process.memoryUsage();
  const total = usage.heapTotal;
  const used = usage.heapUsed;

  return {
    used: Math.round(used / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage: Math.round((used / total) * 100),
  };
}

/**
 * Get request metrics
 */
function getRequestMetrics(): RequestMetrics {
  return {
    total: requestCount,
    errors: errorCount,
    errorRate: requestCount > 0 ? errorCount / requestCount : 0,
  };
}

/**
 * Track requests (call from middleware)
 */
export function trackRequest(isError: boolean = false) {
  requestCount++;
  if (isError) errorCount++;
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics() {
  requestCount = 0;
  errorCount = 0;
  startTime = Date.now();
}
