/**
 * Circuit Breaker for Gemini AI API
 * 
 * Implements exponential backoff + trip-reset logic:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Too many failures, requests blocked for cooldown period
 * - HALF_OPEN: Recovery attempt after cooldown
 */

enum CircuitState {
  CLOSED = 'CLOSED',     // OK, normal operation
  OPEN = 'OPEN',         // Too many failures, blocking
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before trip (default: 5)
  cooldownMs?: number; // Milliseconds before retry (default: 60000 = 1 min)
  successThresholdForClose?: number; // Successes needed to fully close (default: 2)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private failureThreshold: number;
  private cooldownMs: number;
  private successThresholdForClose: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 60000;
    this.successThresholdForClose = options.successThresholdForClose ?? 2;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = CircuitState.HALF_OPEN;
        console.log('[CircuitBreaker] Attempting recovery (HALF_OPEN)');
      } else {
        throw new Error(
          `[CircuitBreaker] OPEN - Service unavailable. Retry in ${
            this.cooldownMs - (Date.now() - this.lastFailureTime)
          }ms`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThresholdForClose) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log('[CircuitBreaker] Recovered to CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.error(
        `[CircuitBreaker] OPEN after ${this.failureCount} failures. Cooldown: ${this.cooldownMs}ms`
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      timeSinceLastFailure: this.lastFailureTime ? Date.now() - this.lastFailureTime : null,
      cooldownMs: this.cooldownMs,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    console.log('[CircuitBreaker] Reset to CLOSED');
  }
}

// Global instance
let geminiCircuitBreaker: CircuitBreaker | null = null;

export function getGeminiCircuitBreaker(): CircuitBreaker {
  if (!geminiCircuitBreaker) {
    geminiCircuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      cooldownMs: 60000, // 1 minute
      successThresholdForClose: 2,
    });
    console.log('[CircuitBreaker] Initialized Gemini API circuit breaker');
  }
  return geminiCircuitBreaker;
}
