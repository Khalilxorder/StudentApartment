import { NextRequest } from 'next/server';

export interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000;

  log(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(securityEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY ${event.severity.toUpperCase()}] ${event.type}: ${event.message}`, event.details);
    }

    // In production, you would send to a logging service like Datadog, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(securityEvent);
    }
  }

  private async sendToLoggingService(event: SecurityEvent) {
    try {
      // Example: Send to external logging service
      // await fetch(process.env.LOGGING_ENDPOINT!, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event),
      // });

      // For now, just log to console
      console.error(`[SECURITY ${event.severity.toUpperCase()}]`, event);
    } catch (error) {
      console.error('Failed to send security event to logging service:', error);
    }
  }

  getEvents(type?: string, limit = 100): SecurityEvent[] {
    let filteredEvents = this.events;

    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }

    return filteredEvents.slice(-limit).reverse();
  }

  getEventsBySeverity(severity: SecurityEvent['severity'], limit = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.severity === severity)
      .slice(-limit)
      .reverse();
  }

  getRecentEvents(minutes = 60): SecurityEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter(event => new Date(event.timestamp) > cutoff);
  }
}

export const securityLogger = new SecurityLogger();

// Utility functions for common security events
export function logSecurity(type: string, details: Record<string, any>, severity: SecurityEvent['severity'] = 'medium') {
  securityLogger.log({
    type,
    severity,
    message: `Security event: ${type}`,
    details,
  });
}

export function logAuthFailure(req: NextRequest, reason: string) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  securityLogger.log({
    type: 'auth_failure',
    severity: 'medium',
    message: `Authentication failed: ${reason}`,
    details: { reason, path: req.nextUrl.pathname },
    ip,
    userAgent,
  });
}

export function logRateLimitExceeded(req: NextRequest, limit: number) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  securityLogger.log({
    type: 'rate_limit_exceeded',
    severity: 'low',
    message: `Rate limit exceeded: ${limit} requests`,
    details: { limit, path: req.nextUrl.pathname, method: req.method },
    ip,
    userAgent,
  });
}

export function logSuspiciousActivity(req: NextRequest, reason: string) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  securityLogger.log({
    type: 'suspicious_activity',
    severity: 'high',
    message: `Suspicious activity detected: ${reason}`,
    details: { reason, path: req.nextUrl.pathname, method: req.method },
    ip,
    userAgent,
  });
}

export function logCSRFViolation(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  securityLogger.log({
    type: 'csrf_violation',
    severity: 'high',
    message: 'CSRF token validation failed',
    details: { path: req.nextUrl.pathname, method: req.method },
    ip,
    userAgent,
  });
}

export function logInputValidationFailure(req: NextRequest, field: string, reason: string) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';

  securityLogger.log({
    type: 'input_validation_failure',
    severity: 'medium',
    message: `Input validation failed for field: ${field} - ${reason}`,
    details: { field, reason, path: req.nextUrl.pathname },
    ip,
  });
}