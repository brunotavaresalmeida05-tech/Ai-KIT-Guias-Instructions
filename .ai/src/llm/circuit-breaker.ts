/**
 * Circuit Breaker Pattern for AI Provider Calls
 * Protects against cascading failures when external LLM APIs are unstable.
 */

import pino from 'pino';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening
  successThreshold?: number; // Number of successes in HALF_OPEN to close
  timeoutMs?: number;        // Time to stay OPEN before trying HALF_OPEN
  name?: string;
}

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is OPEN. Request rejected.`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private nextAttempt = Date.now();
  private failureThreshold: number;
  private successThreshold: number;
  private timeoutMs: number;
  private name: string;
  private logger: pino.Logger;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeoutMs = options.timeoutMs ?? 30000; // 30 seconds
    this.name = options.name ?? 'AI-Provider';
    this.logger = pino({ name: `CircuitBreaker:${this.name}` });
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    this.checkState();

    if (this.state === 'OPEN') {
      this.logger.warn({ name: this.name }, 'Circuit breaker is OPEN. Fast failing.');
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private checkState(): void {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.logger.info({ name: this.name }, 'Timeout expired. Transitioning to HALF_OPEN.');
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      this.logger.debug({ name: this.name, successes: this.successes }, 'Success in HALF_OPEN state.');
      if (this.successes >= this.successThreshold) {
        this.logger.info({ name: this.name }, 'Success threshold reached. Closing circuit breaker.');
        this.state = 'CLOSED';
        this.successes = 0;
      }
    }
  }

  private onFailure(error: Error): void {
    this.failures++;
    this.logger.error({ name: this.name, failures: this.failures, error: error.message }, 'Action failed.');

    if (this.state === 'HALF_OPEN') {
      this.logger.warn({ name: this.name }, 'Failure in HALF_OPEN state. Re-opening circuit.');
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeoutMs;
      return;
    }

    if (this.failures >= this.failureThreshold) {
      this.logger.error({ name: this.name, threshold: this.failureThreshold }, 'Failure threshold reached. Opening circuit breaker.');
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeoutMs;
    }
  }

  getState(): CircuitState {
    this.checkState();
    return this.state;
  }

  getMetrics(): Record<string, any> {
    return {
      name: this.name,
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.logger.info({ name: this.name }, 'Circuit breaker manually reset.');
  }
}
