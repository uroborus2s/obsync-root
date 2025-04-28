/**
 * 性能工具函数模块
 * 提供性能相关的工具函数
 */

// 性能测量函数
export {
  benchmark,
  measure,
  profileFn,
  timer,
  type BenchmarkResult
} from './measure.js';

// 性能优化函数
export {
  debounce,
  memoize,
  nextTick,
  rAF,
  throttle,
  type DebounceOptions,
  type ThrottleOptions
} from './optimize.js';

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
export { asyncCache, type CacheOptions } from './cache.js';

export { batch, limitConcurrency, type BatchOptions } from './batch.js';

// 性能分析工具
export { profile } from './profile.js';
