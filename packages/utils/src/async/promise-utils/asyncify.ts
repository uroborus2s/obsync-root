/**
 * 提供同步函数到异步函数的转换功能
 *
 * 这个工具函数用于将同步函数包装为返回Promise的异步函数，
 * 使同步代码可以在异步上下文中使用。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数转换
 *
 * @packageDocumentation
 */

/**
 * 将同步函数转换为异步函数（返回Promise）
 *
 * 此函数将一个同步函数包装为返回Promise的异步函数，
 * 使其可以在异步上下文（如async/await）中使用。
 * 如果原函数抛出异常，Promise将被拒绝。
 *
 * 与promisify的区别：promisify用于转换Node.js风格的回调函数(error-first callbacks)，
 * 而asyncify用于转换普通的同步函数。
 *
 * @typeParam T - 同步函数类型
 * @param fn - 要转换的同步函数
 * @returns 返回Promise的异步函数，Promise解析为原函数的返回值
 * @throws `TypeError` 如果fn不是函数
 * @throws 如果原函数抛出异常，Promise将被拒绝
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数转换
 *
 * @example
 * ```typescript
 * // 基本使用
 * const syncAdd = (a: number, b: number) => a + b;
 * const asyncAdd = asyncify(syncAdd);
 *
 * // 在异步上下文中使用
 * async function example() {
 *   const result = await asyncAdd(2, 3);
 *   console.log(result); // 输出: 5
 * }
 *
 * // 错误处理
 * const syncDivide = (a: number, b: number) => {
 *   if (b === 0) throw new Error('除数不能为零');
 *   return a / b;
 * };
 *
 * const asyncDivide = asyncify(syncDivide);
 *
 * try {
 *   const result = await asyncDivide(10, 0);
 * } catch (error) {
 *   console.error(error.message); // 输出: '除数不能为零'
 * }
 * ```
 * @public
 */
export function asyncify<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected fn to be a function');
  }

  return async function (...args: Parameters<T>): Promise<ReturnType<T>> {
    return fn(...args);
  };
}
