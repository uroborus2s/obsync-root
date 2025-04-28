/**
 * 重试机制相关函数
 */

import { sleep } from './sleep.js';

/**
 * 重试选项接口
 */
export interface RetryOptions {
  /** 重试次数，默认3 */
  retries?: number;
  /** 重试间隔(ms)，默认1000 */
  delay?: number;
  /** 重试回调 */
  onRetry?: (error: Error, attempt: number) => void;
  /** 条件函数决定是否重试 */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * 重试执行异步函数
 * @param fn 需要执行的异步函数
 * @param options 重试选项
 * @returns Promise，解析为异步函数的执行结果
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    delay: delayMs = 1000,
    onRetry = () => {},
    shouldRetry = () => true
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= retries || !shouldRetry(lastError)) {
        throw lastError;
      }

      onRetry(lastError, attempt + 1);

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  // 这一行代码理论上不会执行，但TypeScript需要明确的返回类型
  throw lastError!;
}
