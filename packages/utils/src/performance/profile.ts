/**
 * @remarks
 * 模块: 
 *
 * 函数性能分析工具，提供用于测量和输出函数性能指标的工具
 *
 * 此模块提供了用于分析函数执行性能的工具，包括执行时间和内存使用情况的测量。
 * 适用于性能调优和问题排查，可以帮助识别应用程序中的性能瓶颈。
 *
 * @example
 * ```typescript
 * import { profile } from '@stratix/utils/performance/profile';
 *
 * // 分析一个函数的性能
 * const result = profile(() => {
 *   // 执行一些操作
 *   return computeExpensiveOperation();
 * }, '复杂计算');
 * ```
 *
 * @remarks
 * 版本: 1.0.0
 * @packageDocumentation
 */

/**
 * 分析函数性能并输出结果
 *
 * 执行指定的函数并收集性能指标，包括执行时间和内存使用（在支持的环境中），
 * 将指标输出到控制台，同时返回函数的执行结果
 *
 * @example
 * ```typescript
 * // 基本使用
 * const result = profile(() => {
 *   return sortLargeArray(data);
 * }, '数组排序');
 * // 输出示例:
 * // [Profile] Starting: 数组排序
 * // [Profile] Completed: 数组排序
 * // [Profile] Time: 125.45ms
 * // [Profile] Memory: 2.34MB (仅在Node.js环境中显示)
 *
 * // 分析异步操作
 * const asyncResult = profile(async () => {
 *   return await fetchData();
 * }, 'API请求');
 *
 * // 不带标签
 * profile(() => {
 *   processData();
 * });
 * // 输出示例:
 * // [Profile] Starting: AnonymousFunction
 * // [Profile] Completed: AnonymousFunction
 * // [Profile] Time: 78.23ms
 * ```
 *
 * @typeParam T - 函数返回值的类型
 * @param fn - 要分析的函数
 * @param label - 分析标签，用于在日志中标识
 * @returns 函数的返回值
 * @remarks
 * 分类: 性能分析
 * 版本: 1.0.0
 * @public
 */
export function profile<T>(fn: () => T, label?: string): T {
  const name = label || 'AnonymousFunction';
  console.log(`[Profile] Starting: ${name}`);

  // 性能测量
  const startTime = performance.now();
  const startMemory =
    typeof process !== 'undefined' && process.memoryUsage
      ? process.memoryUsage().heapUsed
      : null;

  // 执行函数
  const result = fn();

  // 计算性能指标
  const endTime = performance.now();
  const duration = endTime - startTime;

  let memoryDiff = null;
  if (
    startMemory !== null &&
    typeof process !== 'undefined' &&
    process.memoryUsage
  ) {
    const endMemory = process.memoryUsage().heapUsed;
    memoryDiff = endMemory - startMemory;
  }

  // 输出性能报告
  console.log(`[Profile] Completed: ${name}`);
  console.log(`[Profile] Time: ${duration.toFixed(2)}ms`);

  if (memoryDiff !== null) {
    console.log(`[Profile] Memory: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
  }

  return result;
}
