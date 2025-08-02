// @stratix/database 函数式编程工具
// 基于 @stratix/utils 的数据库专用函数式工具

import { curry, pipe, tryCatch } from '@stratix/utils/functional';

import { deepMerge } from '@stratix/utils/data';

// 类型定义 - 使用标准的 Result 模式
export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };
export type Option<T> = { some: true; value: T } | { some: false };
export type DatabaseResult<T> = Result<T, any>;

// 便捷函数
export const success = <T>(data: T): Result<T, any> => ({
  success: true,
  data
});
export const failure = <E>(error: E): Result<any, E> => ({
  success: false,
  error
});

// 映射结果函数
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  mapper: (value: T) => U
): Result<U, E> => {
  if (result.success) {
    return success(mapper(result.data));
  }
  return result as Result<U, E>;
};

// 便捷函数
export const successResult = <T>(data: T): DatabaseResult<T> => success(data);
export const failureResult = <E>(error: E): DatabaseResult<any> =>
  failure(error);

// Option 工具函数
export const some = <T>(value: T): Option<T> => ({ some: true, value });
export const none = <T>(): Option<T> => ({ some: false });

// 从可空值创建 Option
export const fromNullable = <T>(value: T | null | undefined): Option<T> => {
  return value != null ? some(value) : none();
};

// 重新导出其他工具
export { curry, deepMerge, pipe, tryCatch };

// 重试选项
export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
}

// 简化的 memoize 实现
export interface MemoizeOptions {
  ttl?: number;
}

export function memoize<Args extends any[], Return>(
  fn: (...args: Args) => Return,
  options: MemoizeOptions = {}
): (...args: Args) => Return {
  const cache = new Map<string, { value: Return; timestamp: number }>();
  const ttl = options.ttl || 60000; // 默认1分钟

  return (...args: Args): Return => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && (!options.ttl || now - cached.timestamp < ttl)) {
      return cached.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, timestamp: now });
    return result;
  };
}
