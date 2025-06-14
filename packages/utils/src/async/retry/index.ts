/**
 * 异步重试模块，提供延迟和重试相关的工具函数
 *
 * 此模块提供了用于处理异步操作重试的实用工具，
 * 适用于网络请求、数据库操作等需要重试逻辑的场景。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 错误处理
 *
 * @example
 * ```typescript
 * import { retry } from '@stratix/utils/async/retry';
 *
 * // 带重试的API调用
 * const data = await retry(
 *   async () => fetchData(url),
 *   { retries: 3, delay: 1000 }
 * );
 * ```
 *
 * @packageDocumentation
 */

export { retry, type RetryOptions } from './retry.js';
