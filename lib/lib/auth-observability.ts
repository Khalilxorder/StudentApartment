/**
 * Telemetry and observability utilities for auth flows
 * Tracks auth events, redirect loops, and session issues
 */

type AuthEvent = 
  | 'auth_check_start'
  | 'auth_check_success'
  | 'auth_check_error'
  | 'redirect_authenticated'
  | 'redirect_loop_detected'
  | 'session_invalid'
  | 'env_missing'

interface AuthTelemetry {
  event: AuthEvent
  userId?: string
  error?: string
  redirectTo?: string
  timestamp: number
  userAgent?: string
  metadata?: Record<string, any>
}

class AuthObservability {
  private events: AuthTelemetry[] = []
  private readonly MAX_EVENTS = 100

  /**
   * Track an auth-related event
   */
  track(event: AuthEvent, data?: Partial<AuthTelemetry>) {
    const telemetry: AuthTelemetry = {
      event,
      timestamp: Date.now(),
      ...data,
    }

    this.events.push(telemetry)

    // Keep only recent events (prevent memory leak)
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift()
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth Telemetry] ${event}`, data)
    }

    // Send to monitoring in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(telemetry)
    }

    // Check for redirect loops
    this.detectRedirectLoop()
  }

  /**
   * Detect potential redirect loops
   * If we see multiple redirects in quick succession, something's wrong
   */
  private detectRedirectLoop() {
    const recentRedirects = this.events
      .filter(e => e.event === 'redirect_authenticated')
      .filter(e => Date.now() - e.timestamp < 10000) // Last 10 seconds

    if (recentRedirects.length >= 3) {
      console.error('🔄 REDIRECT LOOP DETECTED', {
        count: recentRedirects.length,
        events: recentRedirects,
      })

      this.track('redirect_loop_detected', {
        metadata: {
          loopCount: recentRedirects.length,
          redirectTargets: recentRedirects.map(e => e.redirectTo),
        },
      })

      // TODO: Alert ops team in production
      // alertOps('redirect_loop', { events: recentRedirects })
    }
  }

  /**
   * Send telemetry to monitoring service
   */
  private sendToMonitoring(telemetry: AuthTelemetry) {
    // In production, send to PostHog, Sentry, or custom analytics
    try {
      // Example: PostHog
      // posthog.capture(telemetry.event, {
      //   userId: telemetry.userId,
      //   error: telemetry.error,
      //   ...telemetry.metadata,
      // })

      // Example: Custom analytics endpoint
      // fetch('/api/telemetry', {
      //   method: 'POST',
      //   body: JSON.stringify(telemetry),
      // }).catch(console.error)
    } catch (err) {
      console.warn('Failed to send telemetry:', err)
    }
  }

  /**
   * Get recent events (for debugging)
   */
  getRecentEvents(limit = 10): AuthTelemetry[] {
    return this.events.slice(-limit)
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = []
  }
}

// Singleton instance
export const authObservability = new AuthObservability()

/**
 * Helper to track auth check with automatic timing
 */
export async function trackAuthCheck<T>(
  userId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  authObservability.track('auth_check_start', { userId })

  try {
    const result = await fn()
    const duration = Date.now() - startTime

    authObservability.track('auth_check_success', {
      userId,
      metadata: { duration },
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    authObservability.track('auth_check_error', {
      userId,
      error: error instanceof Error ? error.message : String(error),
      metadata: { duration },
    })

    throw error
  }
}

/**
 * Track redirect with target validation
 */
export function trackRedirect(userId: string, redirectTo: string) {
  authObservability.track('redirect_authenticated', {
    userId,
    redirectTo,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
  })
}

/**
 * Get auth observability stats (for admin dashboard)
 */
export function getAuthStats() {
  const events = authObservability.getRecentEvents(100)
  
  return {
    totalEvents: events.length,
    byType: events.reduce((acc, e) => {
      acc[e.event] = (acc[e.event] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    recentErrors: events
      .filter(e => e.event === 'auth_check_error')
      .slice(-5),
    averageAuthCheckDuration: 
      events
        .filter(e => e.event === 'auth_check_success')
        .reduce((sum, e) => sum + (e.metadata?.duration || 0), 0) /
      events.filter(e => e.event === 'auth_check_success').length || 0,
  }
}
