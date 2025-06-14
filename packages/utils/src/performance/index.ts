/**
 * 性能工具函数模块，提供各种性能优化和测量工具
 *
 * 此模块汇集了各种用于优化和测量应用程序性能的工具函数，包括函数执行时间测量、
 * 资源监控、结果缓存、批处理等。这些工具可用于提高应用程序性能，
 * 减少不必要的计算，以及识别和解决性能瓶颈。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能优化
 *
 * @example
 * ```typescript
 * import { measure, monitorPerformance, nextTick } from '@stratix/utils/performance';
 *
 * // 测量函数执行时间
 * const result = measure(() => {
 *   return computeExpensiveResult();
 * }, '复杂计算');
 *
 * // 监控资源使用
 * const monitor = monitorPerformance((usage) => {
 *   console.log(`CPU: ${usage.cpu.percentage}%, 内存: ${usage.memory.heapUsed / 1024 / 1024}MB`);
 * });
 *
 * // 推迟执行到下一个事件循环
 * nextTick(() => {
 *   console.log('在下一个事件循环中执行');
 * });
 * ```
 *
 * @packageDocumentation
 */

// 性能测量函数
export {
  benchmark,
  measure,
  profileFn,
  timer,
  type BenchmarkResult
} from './measure.js';

// 性能优化函数 - 删除了与async模块重复的debounce和throttle，以及与common模块重复的memoize
export { nextTick, rAF } from './optimize.js';

// 资源监控函数
export {
  getCPUUsage,
  getMemoryUsage,
  getResourceUsage,
  monitorPerformance,
  type CPUUsage,
  type MemoryUsage,
  type ResourceUsage
} from './monitor.js';

// 高级性能工具函数
export { asyncCache, type AsyncCacheOptions } from './cache.js';

// 删除了对limitConcurrency的重复导出，仅保留batch函数
export { batch, type BatchOptions } from './batch.js';

// 性能分析工具
export { profile } from './profile.js';
