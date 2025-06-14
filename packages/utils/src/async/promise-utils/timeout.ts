/**
 * 提供Promise超时控制功能
 *
 * 这些工具函数用于为异步操作添加超时限制，防止Promise永久挂起。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 异步控制
 *
 * @packageDocumentation
 */

/**
 * 创建一个在指定时间后拒绝的Promise
 *
 * 此函数创建一个Promise，它会在指定的毫秒数后自动拒绝，
 * 可用于实现超时控制和竞态条件处理。
 *
 * @param ms - 超时毫秒数
 * @param message - 超时错误消息
 * @returns 一个Promise，将在指定时间后以给定消息拒绝
 * @throws Error 当超时时，抛出包含指定消息的错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 超时控制
 *
 * @example
 * ```typescript
 * // 基本使用
 * try {
 *   await timeout(5000, '请求超时');
 * } catch (err) {
 *   console.error(err.message); // 输出: '请求超时'
 * }
 *
 * // 与Promise.race一起使用
 * const result = await Promise.race([
 *   fetchData(),
 *   timeout(3000, '数据获取超时')
 * ]);
 * ```
 * @public
 */
export function timeout(
  ms: number,
  message: string = '操作超时'
): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * 为Promise添加超时控制，如果原Promise未在指定时间内完成则拒绝
 *
 * 此函数使用Promise.race将原始Promise与一个超时Promise竞争，
 * 如果超时Promise先完成，则返回超时错误。
 *
 * @typeParam T - Promise解析结果的类型
 * @param promise - 需要添加超时控制的Promise
 * @param ms - 超时毫秒数
 * @param message - 超时错误消息
 * @returns 带超时控制的Promise，结果与原Promise相同，或在超时时拒绝
 * @throws 如果原Promise在超时前被拒绝，则传递原始错误；如果超时，则抛出超时错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 超时控制
 *
 * @example
 * ```typescript
 * // 为异步函数添加超时控制
 * try {
 *   const data = await withTimeout(
 *     fetch('https://api.example.com/data'),
 *     5000,
 *     'API请求超时'
 *   );
 *   // 处理数据...
 * } catch (err) {
 *   if (err.message === 'API请求超时') {
 *     // 处理超时情况
 *   } else {
 *     // 处理其他错误
 *   }
 * }
 *
 * // 与async/await一起使用
 * async function fetchWithTimeout(url: string) {
 *   return withTimeout(
 *     fetch(url).then(r => r.json()),
 *     3000,
 *     '获取数据超时'
 *   );
 * }
 * ```
 * @public
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = '操作超时'
): Promise<T> {
  const timeoutPromise = timeout(ms, message);
  return Promise.race([promise, timeoutPromise]);
}
