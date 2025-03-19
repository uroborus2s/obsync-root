/**
 * 通用工具函数
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 检查值是否为null或undefined
 * @param value 要检查的值
 * @returns 如果值为null或undefined则返回true，否则返回false
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 生成唯一全部是数字随机长度的ID
 * @param min 数字id最小长度
 * @param max 数字id最大长度
 * @returns 唯一ID
 */
export function generateNumberId(min: number = 4, max: number = 16): string {
  const length = Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.random().toString(36).substring(2, length);
}

/**
 * 通过uuid生成唯一ID
 * @returns 唯一ID
 */
export function generateUUId(): string {
  return uuidv4();
}

/**
 * 生成唯一ID
 * @returns 唯一ID
 */
export function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * 延迟执行
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param fn 要重试的函数
 * @param options 重试选项
 * @returns 函数执行结果
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onRetry?: (error: Error, attempt: number) => void;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay: delayMs = 1000,
    onRetry = () => {},
    shouldRetry = () => true
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt <= retries && shouldRetry(lastError)) {
        onRetry(lastError, attempt);
        await delay(delayMs);
      } else {
        break;
      }
    }
  }

  throw lastError;
}

/**
 * 安全执行函数
 * @param fn 要执行的函数
 * @param defaultValue 默认值
 * @returns 函数执行结果或默认值
 */
export function safeExecute<T, D = undefined>(
  fn: () => T,
  defaultValue?: D
): T | D {
  try {
    return fn();
  } catch (error) {
    return defaultValue as D;
  }
}

/**
 * 安全执行异步函数
 * @param fn 要执行的异步函数
 * @param defaultValue 默认值
 * @returns 函数执行结果或默认值
 */
export async function safeExecuteAsync<T, D = undefined>(
  fn: () => Promise<T>,
  defaultValue?: D
): Promise<T | D> {
  try {
    return await fn();
  } catch (error) {
    return defaultValue as D;
  }
}
