/**
 * 重试机制相关函数
 *
 * 提供可配置的异步函数重试功能，支持自定义重试次数、间隔时间和重试条件。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 错误处理
 *
 * @packageDocumentation
 */

import { sleep } from '../common/sleep.js';

/**
 * 重试选项接口，配置重试行为
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @example
 * ```typescript
 * // 完整配置示例
 * const options: RetryOptions = {
 *   retries: 5,                                // 最多重试5次
 *   delay: 2000,                               // 每次重试间隔2秒
 *   onRetry: (err, attempt) => {               // 重试回调
 *     console.log(`第${attempt}次重试，错误: ${err.message}`);
 *   },
 *   shouldRetry: (err) => {                    // 仅对网络错误重试
 *     return err.message.includes('network');
 *   }
 * };
 * ```
 * @public
 */
export interface RetryOptions {
  /**
   * 最大重试次数
   * @defaultValue 3
   */
  retries?: number;

  /**
   * 重试间隔时间(毫秒)
   * @defaultValue 1000
   */
  delay?: number;

  /**
   * 重试回调函数，在每次重试前调用
   * @param error - 导致重试的错误
   * @param attempt - 当前重试次数（从1开始）
   */
  onRetry?: (error: Error, attempt: number) => void;

  /**
   * 条件函数，决定是否对特定错误进行重试
   * @param error - 要评估的错误
   * @returns 如果返回true则重试，否则终止并抛出错误
   * @defaultValue `() => true` - 默认对所有错误都重试
   */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * 重试执行异步函数，在失败时自动重新尝试
 *
 * 此函数在执行异步操作失败时提供自动重试能力，适用于网络请求、
 * 数据库操作等可能因暂时性故障而失败的场景。
 *
 * @typeParam T - 异步函数的返回类型
 * @param fn - 需要执行的异步函数
 * @param options - 重试配置选项
 * @returns Promise，解析为异步函数的执行结果
 * @throws `Error` 如果达到最大重试次数或shouldRetry返回false，则抛出最后一次错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 错误处理
 * 选项详情:
 * - options.retries - 最大重试次数，默认为3
 * - options.delay - 重试间隔时间(毫秒)，默认为1000
 * - options.onRetry - 重试回调函数，在每次重试前调用，接收错误对象和当前重试次数(从1开始)
 * - options.shouldRetry - 条件函数，决定是否对特定错误进行重试，默认对所有错误都重试
 *
 * @example
 * ```typescript
 * // 基本使用
 * const result = await retry(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
 *     return response.json();
 *   },
 *   { retries: 3, delay: 1000 }
 * );
 *
 * // 使用重试回调和条件
 * await retry(
 *   async () => sendEmail(user, 'Welcome!'),
 *   {
 *     retries: 5,
 *     delay: 2000,
 *     onRetry: (err, attempt) => {
 *       console.log(`发送邮件重试 #${attempt}: ${err.message}`);
 *       logError('email-retry', { attempt, error: err.message });
 *     },
 *     shouldRetry: (err) => {
 *       // 只对服务器错误(5xx)重试，客户端错误(4xx)直接失败
 *       return /^5\d\d/.test(err.message);
 *     }
 *   }
 * );
 * ```
 * @public
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

  let lastError: Error | null = null;
  let result: T | null = null;
  let succeeded = false;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      result = await fn();
      succeeded = true;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= retries || !shouldRetry(lastError)) {
        break;
      }

      onRetry(lastError, attempt + 1);

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  if (!succeeded && lastError) {
    throw lastError;
  }

  return result as T;
}
