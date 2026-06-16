/**
 * 异步工具函数模块，提供异步操作相关的工具函数
 *
 * 此模块提供了丰富的异步操作工具，包括重试、防抖、节流、并发控制、
 * Promise工具、流程控制等，帮助简化异步操作和控制异步流程。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 异步操作
 *
 * @example
 * ```typescript
 * import { retry, debounce, withTimeout, queue } from '@stratix/utils/async';
 *
 * // 使用重试功能
 * const data = await retry(
 *   async () => fetchData(url),
 *   { retries: 3, delay: 1000 }
 * );
 *
 * // 使用防抖功能
 * const debouncedSave = debounce(saveData, 500);
 * input.addEventListener('input', () => debouncedSave(input.value));
 *
 * // 使用超时控制
 * const result = await withTimeout(
 *   fetch(url).then(r => r.json()),
 *   5000,
 *   '请求超时'
 * );
 *
 * // 使用任务队列
 * const taskQueue = queue(async task => processTask(task), 3);
 * const results = await Promise.all([
 *   taskQueue.push(task1),
 *   taskQueue.push(task2),
 *   taskQueue.push(task3)
 * ]);
 * ```
 *
 * @packageDocumentation
 */

// 导出实际使用的异步工具
export * as common from './common.js';
export * as promiseCombinators from './promise-combinators.js';
export * as concurrency from './concurrency.js';

// 直接导出常用功能
export { sleep } from './common.js';
export {
  executePromises,
  executeParallel,
  executeSequential,
  executeMixed,
  withRetry,
  withTimeout,
  promisePipe,
  ErrorAggregator,
  PromiseStream,
  createPromiseStream,
  fromPromises,
  ConcurrencyController,
  CircuitBreaker,
  ExecutionMode,
  type PromiseExecutionOptions,
  type PromiseResult,
  type RetryOptions
} from './promise-combinators.js';
export {
  SmartQueue,
  ResourcePool,
  RateLimiter,
  TaskPriority,
  TaskStatus,
  type Task,
  type QueueConfig,
  type QueueStats
} from './concurrency.js';
