/**
 * Comprehensive Production Monitoring & Logging System
 * Handles all aspects of application monitoring, logging, and error tracking
 */

import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

// ============================================================================
// Environment Configuration
// ============================================================================

const ENVIRONMENT = process.env.NODE_ENV;
const IS_PRODUCTION = ENVIRONMENT === 'production';
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? 'warn' : 'debug');

// ============================================================================
// Logger Setup
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  stack?: string;
  requestId?: string;
  userId?: string;
  service?: string;
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

export class ProductionLogger {
  private static requestIdMap = new Map<string, string>();

  /**
   * Initialize production logging system
   */
  static initialize() {
    if (IS_PRODUCTION && SENTRY_DSN) {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
      });
    }
  }

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set request context for logging
   */
  static setRequestContext(requestId: string, userId?: string) {
    this.requestIdMap.set(requestId, userId || 'anonymous');
    if (IS_PRODUCTION && SENTRY_DSN) {
      Sentry.setContext('request', {
        id: requestId,
        userId,
      });
    }
  }

  /**
   * Clear request context
   */
  static clearRequestContext(requestId: string) {
    this.requestIdMap.delete(requestId);
  }

  /**
   * Log message with appropriate level
   */
  static log(level: LogLevel, message: string, context?: Record<string, any>) {
    // Check log level threshold
    const levelKey = level as keyof typeof LOG_LEVELS;
    const currentLevelKey = LOG_LEVEL as keyof typeof LOG_LEVELS;
    if (LOG_LEVELS[levelKey] < LOG_LEVELS[currentLevelKey]) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: 'apartment-platform',
    };

    // Output to console
    const color =
      level === 'error' || level === 'critical'
        ? '❌'
        : level === 'warn'
          ? '⚠️'
          : level === 'info'
            ? 'ℹ️'
            : '🔍';

    console.log(`${color} [${level.toUpperCase()}] ${message}`, context || '');

    // Send to error tracking in production
    if (IS_PRODUCTION && SENTRY_DSN && (level === 'error' || level === 'critical')) {
      Sentry.captureMessage(message, level === 'critical' ? 'fatal' : level);
    }
  }

  static debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  static info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  static warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  static error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  static critical(message: string, context?: Record<string, any>) {
    this.log('critical', message, context);
  }
}

// ============================================================================
// Performance Monitoring
// ============================================================================

export class PerformanceMonitor {
  private static marks = new Map<string, number>();
  private static metrics: Record<string, number[]> = {};

  /**
   * Start performance measurement
   */
  static startMeasure(name: string) {
    this.marks.set(name, performance.now());
  }

  /**
   * End performance measurement and log result
   */
  static endMeasure(name: string, threshold?: number) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      ProductionLogger.warn(`Performance mark '${name}' not found`);
      return;
    }

    const duration = performance.now() - startTime;
    const key = `${name}_duration`;

    // Store metric
    if (!this.metrics[key]) {
      this.metrics[key] = [];
    }
    this.metrics[key].push(duration);

    // Check threshold
    if (threshold && duration > threshold) {
      ProductionLogger.warn(`Performance threshold exceeded for '${name}'`, {
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
      });
    }

    // Send to monitoring in production
    if (IS_PRODUCTION && SENTRY_DSN) {
      Sentry.captureMessage(`Performance: ${name} took ${duration.toFixed(2)}ms`, 'info');
    }

    return duration;
  }

  /**
   * Get average metric duration
   */
  static getMetricAverage(name: string): number {
    const key = `${name}_duration`;
    const values = this.metrics[key];
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get metric statistics
   */
  static getMetricStats(name: string) {
    const key = `${name}_duration`;
    const values = this.metrics[key];
    if (!values || values.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }
}

// ============================================================================
// API Health Monitoring
// ============================================================================

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  environment: string;
  services: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
  metrics?: Record<string, any>;
}

export class HealthMonitor {
  private static services: Map<string, () => Promise<boolean>> = new Map();

  /**
   * Register service health check
   */
  static registerService(name: string, checkFn: () => Promise<boolean>) {
    this.services.set(name, checkFn);
  }

  /**
   * Perform full health check
   */
  static async performHealthCheck(): Promise<HealthCheckResponse> {
    const serviceHealths: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';

    // Check all registered services
    this.services.forEach((checkFn, name) => {
      checkFn().then(isHealthy => {
        serviceHealths[name] = isHealthy ? 'healthy' : 'unhealthy';
        if (!isHealthy) {
          overallStatus = 'degraded';
        }
      }).catch((error) => {
        serviceHealths[name] = 'unhealthy';
        overallStatus = 'degraded';
        ProductionLogger.warn(`Service health check failed: ${name}`, {
          error: String(error),
        });
      });
    });

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: ENVIRONMENT,
      services: serviceHealths,
    };
  }
}

// ============================================================================
// Request Logging Middleware
// ============================================================================

export async function logRequest(
  request: Request,
  response: Response,
  duration: number,
  userId?: string
) {
  const requestId = ProductionLogger.generateRequestId();

  const logData = {
    requestId,
    method: request.method,
    url: request.url,
    status: response.status,
    duration: `${duration.toFixed(2)}ms`,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
  };

  // Log all requests in development, only errors in production
  if (!IS_PRODUCTION || response.status >= 400) {
    ProductionLogger.log(response.status >= 500 ? 'error' : 'info', `${request.method} ${request.url}`, logData);
  }

  // Send to monitoring
  if (IS_PRODUCTION && SENTRY_DSN && response.status >= 400) {
    Sentry.captureMessage(`${request.method} ${request.url} - ${response.status}`, 'info');
  }

  return requestId;
}

// ============================================================================
// Error Handling
// ============================================================================

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    requestId: string;
    details?: Record<string, any>;
  };
}

export function handleError(error: unknown, requestId?: string): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code || 'INTERNAL_ERROR';
  const errorDetails = (error as any)?.details;

  ProductionLogger.error('API Error', {
    message: errorMessage,
    code: errorCode,
    requestId,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Send to Sentry
  if (IS_PRODUCTION && SENTRY_DSN) {
    Sentry.captureException(error);
  }

  return {
    success: false,
    error: {
      message: IS_PRODUCTION ? 'An error occurred' : errorMessage,
      code: errorCode,
      requestId: requestId || 'unknown',
      ...(IS_PRODUCTION ? {} : { details: errorDetails }),
    },
  };
}

// ============================================================================
// Metrics Collection
// ============================================================================

export interface MetricsData {
  timestamp: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  uptime: number;
  performance: Record<string, any>;
}

export class MetricsCollector {
  /**
   * Collect current system metrics
   */
  static collectMetrics(): MetricsData {
    const memUsage = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      uptime: Math.round(process.uptime()),
      performance: {
        // Add performance metrics from PerformanceMonitor
        apiResponseTime: PerformanceMonitor.getMetricStats('api_request'),
        databaseQueryTime: PerformanceMonitor.getMetricStats('db_query'),
      },
    };
  }

  /**
   * Check if metrics indicate problems
   */
  static checkHealthMetrics(): { healthy: boolean; issues: string[] } {
    const metrics = this.collectMetrics();
    const issues: string[] = [];

    // Check memory usage
    if (metrics.memory.heapUsed > metrics.memory.heapTotal * 0.9) {
      issues.push('Heap usage above 90%');
    }

    // Check RSS
    if (metrics.memory.rss > 1024) {
      // 1GB
      issues.push('RSS memory usage above 1GB');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}

// ============================================================================
// Export public API
// ============================================================================

const ProductionMonitoringAPI = {
  ProductionLogger,
  PerformanceMonitor,
  HealthMonitor,
  MetricsCollector,
  handleError,
  logRequest,
};

export default ProductionMonitoringAPI;
