/**
 * 重试策略接口和基础实现
 */

import { createLogger, Logger, LogLevel } from '../utils/index.js';

// 重试策略接口
export interface RetryPolicy {
  /**
   * 计算下次重试的延迟时间（毫秒）
   * @param attempt 当前重试次数（从1开始）
   * @param error 导致重试的错误
   * @returns 延迟时间（毫秒），返回-1表示不再重试
   */
  calculateDelay(attempt: number, error?: Error): number;

  /**
   * 判断是否应该重试
   * @param attempt 当前重试次数
   * @param error 导致重试的错误
   * @returns 是否应该重试
   */
  shouldRetry(attempt: number, error?: Error): boolean;

  /**
   * 获取最大重试次数
   */
  getMaxAttempts(): number;

  /**
   * 重置策略状态
   */
  reset(): void;
}

// 重试策略配置
export interface RetryPolicyConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

// 抽象重试策略基类
export abstract class BaseRetryPolicy implements RetryPolicy {
  protected logger: Logger;
  protected maxAttempts: number;
  protected baseDelay: number;
  protected maxDelay: number;
  protected jitter: boolean;
  protected retryableErrors: Set<string>;
  protected nonRetryableErrors: Set<string>;

  constructor(config: RetryPolicyConfig = {}) {
    this.logger = createLogger({ level: LogLevel.INFO, format: 'json' });
    this.logger.setContext({ component: 'RetryPolicy' });
    this.maxAttempts = config.maxAttempts || 3;
    this.baseDelay = config.baseDelay || 1000;
    this.maxDelay = config.maxDelay || 30000;
    this.jitter = config.jitter !== false;
    this.retryableErrors = new Set(config.retryableErrors || []);
    this.nonRetryableErrors = new Set(config.nonRetryableErrors || []);
  }

  abstract calculateDelay(attempt: number, error?: Error): number;

  shouldRetry(attempt: number, error?: Error): boolean {
    // 检查重试次数
    if (attempt > this.maxAttempts) {
      return false;
    }

    // 检查错误类型
    if (error) {
      const errorType = error.constructor.name;
      const errorCode = (error as any).code;

      // 如果在非重试错误列表中，不重试
      if (
        this.nonRetryableErrors.has(errorType) ||
        (errorCode && this.nonRetryableErrors.has(errorCode))
      ) {
        return false;
      }

      // 如果指定了可重试错误列表，只重试列表中的错误
      if (this.retryableErrors.size > 0) {
        return (
          this.retryableErrors.has(errorType) ||
          (errorCode && this.retryableErrors.has(errorCode))
        );
      }
    }

    return true;
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  reset(): void {
    // 基类默认不需要重置状态
  }

  /**
   * 添加抖动
   */
  protected addJitter(delay: number): number {
    if (!this.jitter) {
      return delay;
    }

    // 添加±25%的随机抖动
    const jitterRange = delay * 0.25;
    const jitterAmount = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, delay + jitterAmount);
  }

  /**
   * 限制最大延迟
   */
  protected limitDelay(delay: number): number {
    return Math.min(delay, this.maxDelay);
  }
}

// 固定延迟重试策略
export class FixedDelayRetryPolicy extends BaseRetryPolicy {
  calculateDelay(attempt: number, error?: Error): number {
    if (!this.shouldRetry(attempt, error)) {
      return -1;
    }

    const delay = this.baseDelay;
    return this.addJitter(this.limitDelay(delay));
  }
}

// 线性退避重试策略
export class LinearBackoffRetryPolicy extends BaseRetryPolicy {
  private multiplier: number;

  constructor(config: RetryPolicyConfig & { multiplier?: number } = {}) {
    super(config);
    this.multiplier = config.multiplier || 1;
  }

  calculateDelay(attempt: number, error?: Error): number {
    if (!this.shouldRetry(attempt, error)) {
      return -1;
    }

    const delay = this.baseDelay * attempt * this.multiplier;
    return this.addJitter(this.limitDelay(delay));
  }
}

// 指数退避重试策略
export class ExponentialBackoffRetryPolicy extends BaseRetryPolicy {
  private multiplier: number;
  private base: number;

  constructor(
    config: RetryPolicyConfig & { multiplier?: number; base?: number } = {}
  ) {
    super(config);
    this.multiplier = config.multiplier || 1;
    this.base = config.base || 2;
  }

  calculateDelay(attempt: number, error?: Error): number {
    if (!this.shouldRetry(attempt, error)) {
      return -1;
    }

    const delay =
      this.baseDelay * this.multiplier * Math.pow(this.base, attempt - 1);
    return this.addJitter(this.limitDelay(delay));
  }
}

// 自定义重试策略
export class CustomRetryPolicy extends BaseRetryPolicy {
  private delayFunction: (attempt: number, error?: Error) => number;

  constructor(
    delayFunction: (attempt: number, error?: Error) => number,
    config: RetryPolicyConfig = {}
  ) {
    super(config);
    this.delayFunction = delayFunction;
  }

  calculateDelay(attempt: number, error?: Error): number {
    if (!this.shouldRetry(attempt, error)) {
      return -1;
    }

    const delay = this.delayFunction(attempt, error);
    return this.addJitter(this.limitDelay(delay));
  }
}

// 装饰器退避策略（结合多种策略）
export class DecoratedRetryPolicy extends BaseRetryPolicy {
  private strategies: RetryPolicy[];
  private currentStrategyIndex = 0;

  constructor(strategies: RetryPolicy[], config: RetryPolicyConfig = {}) {
    super(config);
    this.strategies = strategies;
  }

  calculateDelay(attempt: number, error?: Error): number {
    if (!this.shouldRetry(attempt, error)) {
      return -1;
    }

    // 根据重试次数选择不同的策略
    const strategyIndex = Math.min(
      this.currentStrategyIndex,
      this.strategies.length - 1
    );

    const strategy = this.strategies[strategyIndex];
    const delay = strategy.calculateDelay(attempt, error);

    // 如果当前策略返回-1，尝试下一个策略
    if (delay === -1 && strategyIndex < this.strategies.length - 1) {
      this.currentStrategyIndex++;
      return this.calculateDelay(attempt, error);
    }

    return delay;
  }

  reset(): void {
    super.reset();
    this.currentStrategyIndex = 0;
    this.strategies.forEach((strategy) => strategy.reset());
  }
}

// 断路器重试策略
export class CircuitBreakerRetryPolicy extends BaseRetryPolicy {
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerTimeout: number;
  private failureThreshold: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    config: RetryPolicyConfig & {
      circuitBreakerTimeout?: number;
      failureThreshold?: number;
    } = {}
  ) {
    super(config);
    this.circuitBreakerTimeout = config.circuitBreakerTimeout || 60000; // 1分钟
    this.failureThreshold = config.failureThreshold || 5;
  }

  shouldRetry(attempt: number, error?: Error): boolean {
    const now = Date.now();

    // 更新断路器状态
    this.updateCircuitBreakerState(now, error);

    // 如果断路器打开，不允许重试
    if (this.state === 'OPEN') {
      this.logger.warn('Circuit breaker is OPEN, blocking retry attempts');
      return false;
    }

    return super.shouldRetry(attempt, error);
  }

  calculateDelay(attempt: number, error?: Error): number {
    if (!this.shouldRetry(attempt, error)) {
      return -1;
    }

    // 在半开状态下，使用较长的延迟
    const baseDelay =
      this.state === 'HALF_OPEN' ? this.baseDelay * 2 : this.baseDelay;

    const delay = baseDelay * Math.pow(2, attempt - 1);
    return this.addJitter(this.limitDelay(delay));
  }

  private updateCircuitBreakerState(now: number, error?: Error): void {
    switch (this.state) {
      case 'CLOSED':
        if (error) {
          this.failureCount++;
          this.lastFailureTime = now;
          if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.logger.warn(
              `Circuit breaker opened after ${this.failureCount} failures`
            );
          }
        } else {
          this.failureCount = 0;
        }
        break;

      case 'OPEN':
        if (now - this.lastFailureTime >= this.circuitBreakerTimeout) {
          this.state = 'HALF_OPEN';
          this.logger.info('Circuit breaker moved to HALF_OPEN state');
        }
        break;

      case 'HALF_OPEN':
        if (error) {
          this.state = 'OPEN';
          this.lastFailureTime = now;
          this.logger.warn(
            'Circuit breaker reopened due to failure in HALF_OPEN state'
          );
        } else {
          this.state = 'CLOSED';
          this.failureCount = 0;
          this.logger.info('Circuit breaker closed after successful operation');
        }
        break;
    }
  }

  reset(): void {
    super.reset();
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }
}

// 重试策略工厂
export class RetryPolicyFactory {
  private static policies: Map<string, (config?: any) => RetryPolicy> =
    new Map();

  static {
    // 注册内置策略
    this.register('fixed', (config) => new FixedDelayRetryPolicy(config));
    this.register('linear', (config) => new LinearBackoffRetryPolicy(config));
    this.register(
      'exponential',
      (config) => new ExponentialBackoffRetryPolicy(config)
    );
    this.register(
      'circuit-breaker',
      (config) => new CircuitBreakerRetryPolicy(config)
    );
  }

  /**
   * 注册重试策略
   */
  static register(name: string, factory: (config?: any) => RetryPolicy): void {
    this.policies.set(name, factory);
  }

  /**
   * 创建重试策略
   */
  static create(name: string, config?: any): RetryPolicy {
    const factory = this.policies.get(name);
    if (!factory) {
      throw new Error(`Unknown retry policy: ${name}`);
    }
    return factory(config);
  }

  /**
   * 获取所有可用的策略名称
   */
  static getAvailablePolicies(): string[] {
    return Array.from(this.policies.keys());
  }

  /**
   * 检查策略是否存在
   */
  static has(name: string): boolean {
    return this.policies.has(name);
  }

  /**
   * 创建组合重试策略
   */
  static createComposite(
    strategies: RetryPolicy[],
    config?: RetryPolicyConfig
  ): RetryPolicy {
    return new DecoratedRetryPolicy(strategies, config);
  }

  /**
   * 创建自定义重试策略
   */
  static createCustom(
    delayFunction: (attempt: number, error?: Error) => number,
    config?: RetryPolicyConfig
  ): RetryPolicy {
    return new CustomRetryPolicy(delayFunction, config);
  }

  /**
   * 创建预配置的生产环境策略
   */
  static createProductionPolicy(): RetryPolicy {
    return new ExponentialBackoffRetryPolicy({
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: true,
      nonRetryableErrors: [
        'ValidationError',
        'AuthenticationError',
        'AuthorizationError'
      ]
    });
  }

  /**
   * 创建预配置的开发环境策略
   */
  static createDevelopmentPolicy(): RetryPolicy {
    return new FixedDelayRetryPolicy({
      maxAttempts: 3,
      baseDelay: 500,
      maxDelay: 5000,
      jitter: false
    });
  }
}

// 重试执行器
export class RetryExecutor {
  private policy: RetryPolicy;
  private logger: Logger;

  constructor(policy: RetryPolicy) {
    this.policy = policy;
    this.logger = createLogger({ level: LogLevel.INFO, format: 'json' });
    this.logger.setContext({ component: 'RetryExecutor' });
  }

  /**
   * 执行带重试的操作
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: { operationName?: string; metadata?: any }
  ): Promise<T> {
    let attempt = 0;
    let lastError: Error | undefined;

    this.policy.reset();

    while (true) {
      attempt++;

      try {
        const result = await operation();

        if (attempt > 1) {
          this.logger.info(`Operation succeeded after ${attempt} attempts`, {
            operationName: context?.operationName,
            attempts: attempt,
            metadata: context?.metadata
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const delay = this.policy.calculateDelay(attempt, lastError);

        if (delay === -1) {
          this.logger.error(
            `Operation failed after ${attempt} attempts`,
            lastError,
            {
              operationName: context?.operationName,
              attempts: attempt,
              metadata: context?.metadata
            }
          );
          throw lastError;
        }

        this.logger.warn(`Operation failed, retrying in ${delay}ms`, {
          operationName: context?.operationName,
          attempt,
          error: lastError.message,
          delay,
          metadata: context?.metadata
        });

        await this.sleep(delay);
      }
    }
  }

  /**
   * 睡眠指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 更新重试策略
   */
  setPolicy(policy: RetryPolicy): void {
    this.policy = policy;
  }

  /**
   * 获取当前重试策略
   */
  getPolicy(): RetryPolicy {
    return this.policy;
  }
}

// 便捷函数
export const createRetryPolicy = (
  type: 'fixed' | 'linear' | 'exponential',
  config?: RetryPolicyConfig
): RetryPolicy => {
  return RetryPolicyFactory.create(type, config);
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  policy: RetryPolicy | string,
  config?: RetryPolicyConfig & { operationName?: string; metadata?: any }
): Promise<T> => {
  const retryPolicy =
    typeof policy === 'string'
      ? RetryPolicyFactory.create(policy, config)
      : policy;

  const executor = new RetryExecutor(retryPolicy);

  return executor.execute(operation, {
    operationName: config?.operationName,
    metadata: config?.metadata
  });
};
