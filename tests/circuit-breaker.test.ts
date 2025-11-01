/**
 * Unit Tests: Circuit Breaker
 * Tests state transitions, timeout recovery, and metrics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from '@/lib/circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      cooldownMs: 100,
      successThresholdForClose: 2,
    });
  });

  describe('State Transitions', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN after failure threshold', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should transition to HALF_OPEN after cooldown', async () => {
      // Trip to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }
      expect(breaker.getState()).toBe('OPEN');

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next call should transition to HALF_OPEN
      try {
        await breaker.execute(() => Promise.resolve('success'));
      } catch {
        // May throw if still in recovery
      }
      expect(breaker.getState()).toMatch(/HALF_OPEN|CLOSED/);
    });

    it('should recover to CLOSED after successes in HALF_OPEN', async () => {
      // Trip to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 150));

      // Succeed twice in HALF_OPEN
      const results = [];
      for (let i = 0; i < 2; i++) {
        try {
          const result = await breaker.execute(() => Promise.resolve('ok'));
          results.push(result);
        } catch {
          // Expected first time
        }
      }

      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('Request Blocking', () => {
    it('should allow requests in CLOSED state', async () => {
      const result = await breaker.execute(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
    });

    it('should block requests in OPEN state', async () => {
      // Trip to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Should throw immediately without calling function
      await expect(breaker.execute(() => Promise.resolve('should not run'))).rejects.toThrow(
        /OPEN/
      );
    });

    it('should allow limited requests in HALF_OPEN state', async () => {
      // Trip to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should transition to HALF_OPEN and allow the call
      try {
        await breaker.execute(() => Promise.resolve('recovery attempt'));
      } catch {
        // May throw depending on timing
      }
      // Should now be HALF_OPEN or CLOSED
      expect(breaker.getState()).toMatch(/HALF_OPEN|CLOSED/);
    });
  });

  describe('Error Handling', () => {
    it('should increment failure count on error', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      const status = breaker.getStatus();
      expect(status.failureCount).toBe(1);
    });

    it('should reset failure count on success', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      await breaker.execute(() => Promise.resolve('ok'));

      const status = breaker.getStatus();
      expect(status.failureCount).toBe(0);
    });
  });

  describe('Metrics and Status', () => {
    it('should provide current status', () => {
      const status = breaker.getStatus();
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('failureThreshold');
      expect(status).toHaveProperty('cooldownMs');
    });

    it('should track time since last failure', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      const status = breaker.getStatus();
      expect(status.timeSinceLastFailure).toBeDefined();
      expect(status.timeSinceLastFailure! > 0).toBe(true);
    });
  });

  describe('Manual Reset', () => {
    it('should reset to CLOSED state', async () => {
      // Trip to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // Expected
        }
      }

      breaker.reset();
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should clear failure count on reset', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      breaker.reset();
      const status = breaker.getStatus();
      expect(status.failureCount).toBe(0);
    });
  });
});
