// Performance Monitoring Middleware
// Automatically records performance metrics for all API routes
import { NextRequest, NextResponse } from 'next/server';
import { performanceOptimizationService } from '@/services/performance-optimization-svc';

export async function performanceMiddleware(
  request: NextRequest,
  response: NextResponse
) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const method = request.method;

  // Get response details
  const statusCode = response.status;
  const responseTime = Date.now() - startTime;

  // Extract additional metrics
  const userAgent = request.headers.get('user-agent') || '';
  const ipAddress = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

  // Check if this was a cache hit (from response headers)
  const cacheHit = response.headers.get('x-cache-status') === 'HIT';

  // Record metrics
  try {
    await performanceOptimizationService.recordMetric({
      endpoint,
      method,
      responseTime,
      statusCode,
      userAgent,
    });

    // Apply optimization rules if needed
    if (statusCode >= 400 || responseTime > 1000) {
      // This method is not yet implemented
      // await performanceOptimizationService.applyOptimizations(endpoint);
    }

  } catch (error) {
    console.error('Performance middleware error:', error);
    // Don't fail the request if metrics recording fails
  }

  return response;
}

// Cache middleware for GET requests
export async function cacheMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const method = request.method;

  // Only cache GET requests
  if (method !== 'GET') {
    return handler();
  }

  // Create cache key
  const cacheKey = `api:${endpoint}:${url.search}`;

  try {
    // Try to get cached response
    const cachedData = await performanceOptimizationService.getCached(cacheKey);

    if (cachedData) {
      // Return cached response
      const cachedResponse = NextResponse.json(cachedData.data, {
        status: cachedData.statusCode,
        headers: {
          'x-cache-status': 'HIT',
          ...cachedData.headers,
        },
      });

      return cachedResponse;
    }

    // Execute handler
    const response = await handler();

    // Cache successful responses
    if (response.status >= 200 && response.status < 300) {
      const responseData = await response.clone().json();
      const headers = Object.fromEntries(response.headers.entries());

      await performanceOptimizationService.setCached(
        cacheKey,
        {
          data: responseData,
          statusCode: response.status,
          headers,
        },
        300, // 5 minutes TTL
        ['api', endpoint]
      );

      // Add cache miss header
      response.headers.set('x-cache-status', 'MISS');
    }

    return response;

  } catch (error) {
    console.error('Cache middleware error:', error);
    // Fall back to normal handler
    return handler();
  }
}