/**
 * Promise组合工具 - 并行、串行、混合执行模式
 * 提供丰富的异步操作组合能力
 */

import { Either, left, right } from '../functional/either.js';

/**
 * Promise执行模式
 */
export enum ExecutionMode {
  /** 并行执行 */
  Parallel = 'parallel',
  /** 串行执行 */
  Sequential = 'sequential',
  /** 混合执行 */
  Mixed = 'mixed'
}

/**
 * Promise执行选项
 */
export interface PromiseExecutionOptions {
  /** 执行模式 */
  mode?: ExecutionMode;
  /** 并发数量限制 */
  concurrency?: number;
  /** 超时时间(毫秒) */
  timeout?: number;
  /** 取消信号 */
  signal?: AbortSignal;
  /** 失败后是否继续执行其他任务 */
  failFast?: boolean;
}

/**
 * 执行结果
 */
export interface PromiseResult<T> {
  /** 执行结果 */
  results: T[];
  /** 错误列表 */
  errors: Error[];
  /** 执行统计 */
  stats: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
  };
}

/**
 * 并行执行Promise数组
 */
export async function executeParallel<T>(
  promises: (() => Promise<T>)[],
  options: PromiseExecutionOptions = {}
): Promise<PromiseResult<T>> {
  const startTime = Date.now();
  const { timeout, signal, failFast = false } = options;

  const results: T[] = [];
  const errors: Error[] = [];

  try {
    let promiseArray = promises.map((fn) => fn());

    // 添加超时控制
    if (timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      });
      promiseArray = promiseArray.map((p) => Promise.race([p, timeoutPromise]));
    }

    // 添加取消控制
    if (signal) {
      promiseArray = promiseArray.map((p) => withCancellation(p, signal));
    }

    if (failFast) {
      // 快速失败模式
      const settledResults = await Promise.all(promiseArray);
      results.push(...settledResults);
    } else {
      // 收集所有结果，包括失败的
      const settledResults = await Promise.allSettled(promiseArray);

      for (const result of settledResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason);
        }
      }
    }
  } catch (error) {
    errors.push(error as Error);
  }

  return {
    results,
    errors,
    stats: {
      total: promises.length,
      successful: results.length,
      failed: errors.length,
      duration: Date.now() - startTime
    }
  };
}

/**
 * 串行执行Promise数组
 */
export async function executeSequential<T>(
  promises: (() => Promise<T>)[],
  options: PromiseExecutionOptions = {}
): Promise<PromiseResult<T>> {
  const startTime = Date.now();
  const { timeout, signal, failFast = false } = options;

  const results: T[] = [];
  const errors: Error[] = [];

  for (const promiseFn of promises) {
    // 检查取消信号
    if (signal?.aborted) {
      errors.push(new Error('Operation was cancelled'));
      break;
    }

    try {
      let promise = promiseFn();

      // 添加超时控制
      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeout}ms`));
          }, timeout);
        });
        promise = Promise.race([promise, timeoutPromise]);
      }

      // 添加取消控制
      if (signal) {
        promise = withCancellation(promise, signal);
      }

      const result = await promise;
      results.push(result);
    } catch (error) {
      errors.push(error as Error);

      if (failFast) {
        break;
      }
    }
  }

  return {
    results,
    errors,
    stats: {
      total: promises.length,
      successful: results.length,
      failed: errors.length,
      duration: Date.now() - startTime
    }
  };
}

/**
 * 混合执行 - 有限并发数的并行执行
 */
export async function executeMixed<T>(
  promises: (() => Promise<T>)[],
  options: PromiseExecutionOptions = {}
): Promise<PromiseResult<T>> {
  const startTime = Date.now();
  const { concurrency = 3, timeout, signal, failFast = false } = options;

  const results: T[] = [];
  const errors: Error[] = [];
  const executing: Promise<void>[] = [];
  let shouldStop = false;

  for (let i = 0; i < promises.length && !shouldStop; i++) {
    // 检查取消信号
    if (signal?.aborted) {
      errors.push(new Error('Operation was cancelled'));
      break;
    }

    const promiseFn = promises[i];

    const execute = async () => {
      try {
        let promise = promiseFn();

        // 添加超时控制
        if (timeout) {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Operation timed out after ${timeout}ms`));
            }, timeout);
          });
          promise = Promise.race([promise, timeoutPromise]);
        }

        // 添加取消控制
        if (signal) {
          promise = withCancellation(promise, signal);
        }

        const result = await promise;
        results.push(result);
      } catch (error) {
        errors.push(error as Error);

        if (failFast) {
          shouldStop = true;
        }
      }
    };

    executing.push(execute());

    // 限制并发数
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // 移除已完成的任务
      for (let j = executing.length - 1; j >= 0; j--) {
        const settled = await Promise.allSettled([executing[j]]);
        if (
          settled[0].status === 'fulfilled' ||
          settled[0].status === 'rejected'
        ) {
          executing.splice(j, 1);
          break;
        }
      }
    }
  }

  // 等待所有任务完成
  await Promise.allSettled(executing);

  return {
    results,
    errors,
    stats: {
      total: promises.length,
      successful: results.length,
      failed: errors.length,
      duration: Date.now() - startTime
    }
  };
}

/**
 * 添加取消支持的Promise包装器
 */
function withCancellation<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(new Error('Operation was cancelled'));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
  });
}

/**
 * 统一的Promise执行器
 */
export async function executePromises<T>(
  promises: (() => Promise<T>)[],
  options: PromiseExecutionOptions = {}
): Promise<PromiseResult<T>> {
  const { mode = ExecutionMode.Parallel } = options;

  switch (mode) {
    case ExecutionMode.Sequential:
      return executeSequential(promises, options);
    case ExecutionMode.Mixed:
      return executeMixed(promises, options);
    case ExecutionMode.Parallel:
    default:
      return executeParallel(promises, options);
  }
}

/**
 * 重试机制
 */
export interface RetryOptions {
  /** 重试次数 */
  retries: number;
  /** 延迟时间(毫秒) */
  delay?: number;
  /** 指数退避因子 */
  backoffFactor?: number;
  /** 最大延迟时间 */
  maxDelay?: number;
  /** 重试条件判断 */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * 带重试的Promise执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<Either<Error, T>> {
  const {
    retries,
    delay = 1000,
    backoffFactor = 2,
    maxDelay = 30000,
    shouldRetry = () => true
  } = options;

  let currentDelay = delay;
  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      return right(result);
    } catch (error) {
      lastError = error as Error;

      if (attempt === retries || !shouldRetry(lastError)) {
        break;
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay = Math.min(currentDelay * backoffFactor, maxDelay);
    }
  }

  return left(lastError!);
}

/**
 * 超时控制
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Promise管道工具
 */
export function promisePipe<T>(...fns: Array<(value: any) => Promise<any>>) {
  return async (initialValue: T): Promise<any> => {
    let result = initialValue;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}

/**
 * 错误聚合器
 */
export class ErrorAggregator {
  private errors: Error[] = [];

  add(error: Error): void {
    this.errors.push(error);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): Error[] {
    return [...this.errors];
  }

  getAggregatedError(): Error | null {
    if (this.errors.length === 0) return null;
    if (this.errors.length === 1) return this.errors[0];

    const message = `Multiple errors occurred:\n${this.errors.map((e, i) => `${i + 1}. ${e.message}`).join('\n')}`;
    const aggregated = new Error(message);
    aggregated.name = 'AggregatedError';
    return aggregated;
  }

  clear(): void {
    this.errors = [];
  }
}

/**
 * Promise流式处理器
 */
export class PromiseStream<T> {
  private readonly source: AsyncIterable<T>;

  constructor(source: AsyncIterable<T>) {
    this.source = source;
  }

  /**
   * 映射每个元素
   */
  map<U>(fn: (value: T) => Promise<U> | U): PromiseStream<U> {
    const self = this;
    return new PromiseStream({
      async *[Symbol.asyncIterator]() {
        for await (const item of self.source) {
          yield await fn(item);
        }
      }
    });
  }

  /**
   * 过滤元素
   */
  filter(
    predicate: (value: T) => Promise<boolean> | boolean
  ): PromiseStream<T> {
    const self = this;
    return new PromiseStream({
      async *[Symbol.asyncIterator]() {
        for await (const item of self.source) {
          if (await predicate(item)) {
            yield item;
          }
        }
      }
    });
  }

  /**
   * 批量处理
   */
  batch(size: number): PromiseStream<T[]> {
    const self = this;
    return new PromiseStream({
      async *[Symbol.asyncIterator]() {
        let batch: T[] = [];
        for await (const item of self.source) {
          batch.push(item);
          if (batch.length >= size) {
            yield batch;
            batch = [];
          }
        }
        if (batch.length > 0) {
          yield batch;
        }
      }
    });
  }

  /**
   * 收集所有结果到数组
   */
  async toArray(): Promise<T[]> {
    const results: T[] = [];
    for await (const item of this.source) {
      results.push(item);
    }
    return results;
  }
}

/**
 * 创建Promise流
 */
export function createPromiseStream<T>(
  source: AsyncIterable<T>
): PromiseStream<T> {
  return new PromiseStream(source);
}

/**
 * 从Promise数组创建流
 */
export function fromPromises<T>(promises: Promise<T>[]): PromiseStream<T> {
  return new PromiseStream({
    async *[Symbol.asyncIterator]() {
      for (const promise of promises) {
        yield await promise;
      }
    }
  });
}

/**
 * 并发控制器
 */
export class ConcurrencyController {
  private running = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    const next = this.waiting.shift();
    if (next) {
      next();
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * 断路器模式实现
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold = 5,
    private readonly timeoutMs = 60000,
    private readonly monitoringPeriodMs = 10000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }

  getState(): string {
    return this.state;
  }
}
