/**
 * @remarks
 * 模块: 
 *
 * 性能测量相关函数，提供代码执行时间测量、基准测试和性能分析工具
 *
 * 此模块提供了一系列用于测量代码性能的工具函数，包括简单的执行时间测量、
 * 多次迭代的基准测试以及与浏览器性能分析API集成的分析工具。
 *
 * @remarks
 * 版本: 1.0.0
 *
 * @example
 * ```typescript
 * import { measure, timer, benchmark } from '@stratix/utils/performance/measure';
 *
 * // 测量函数执行时间
 * const result = measure(() => {
 *   // 执行一些操作
 *   return complexCalculation();
 * }, 'Complex calculation');
 *
 * // 使用计时器测量代码块
 * const t = timer('Data processing');
 * processData();
 * const elapsed = t.stop(); // 返回经过的毫秒数
 * ```
 *
 * @packageDocumentation
 */

/**
 * 测量函数执行时间
 *
 * 执行提供的函数并测量其执行时间，可选择性地记录到控制台
 *
 * @param fn - 要测量的函数
 * @param label - 测量标签，用于在日志中标识
 * @returns 函数的返回值
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能测量
 *
 * @example
 * ```typescript
 * // 基本使用
 * const result = measure(() => {
 *   return expensiveOperation();
 * }, 'Expensive operation');
 * // 控制台输出: [Performance] Expensive operation: 123ms
 *
 * // 不带标签
 * measure(() => {
 *   updateUI();
 * });
 * // 控制台输出: [Performance] Execution time: 45ms
 * ```
 * @public
 */
export function measure<T>(fn: () => T, label?: string): T {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (label) {
    console.log(`[Performance] ${label}: ${Math.round(duration)}ms`);
  } else {
    console.log(`[Performance] Execution time: ${Math.round(duration)}ms`);
  }

  return result;
}

/**
 * 创建一个简单的计时器，用于测量代码块的执行时间
 *
 * 返回一个带有stop方法的对象，调用该方法停止计时并获取耗时
 *
 * @param label - 计时器标签，用于在日志中标识
 * @returns 一个对象，包含stop方法，调用该方法停止计时并返回经过的毫秒数
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能测量
 *
 * @example
 * ```typescript
 * // 基本使用
 * const t = timer('API Request');
 * await fetchData();
 * const elapsed = t.stop();
 * // 控制台输出: [Timer] API Request: 350ms
 *
 * // 获取执行时间而不输出日志
 * const silent = timer();
 * doSomething();
 * const time = silent.stop(); // 不会输出日志，但返回经过的毫秒数
 * ```
 * @public
 */
export function timer(label?: string): { stop: () => number } {
  const startTime = performance.now();

  return {
    stop: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (label) {
        console.log(`[Timer] ${label}: ${Math.round(duration)}ms`);
      }

      return duration;
    }
  };
}

/**
 * 基准测试结果接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能测量
 *
 * @public
 */
export interface BenchmarkResult<T> {
  /** 函数的最后一次执行结果 */
  result: T;
  /** 平均执行时间（毫秒） */
  averageTime: number;
  /** 总执行时间（毫秒） */
  totalTime: number;
  /** 执行迭代次数 */
  iterations: number;
}

/**
 * 对函数进行基准测试，多次运行并计算平均执行时间
 *
 * 多次执行提供的函数，并计算平均执行时间、总时间等性能指标
 *
 * @param fn - 要测试的函数
 * @param iterations - 迭代次数，默认为1000
 * @param label - 测试标签，用于在日志中标识
 * @returns 包含测试结果的对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能测量
 *
 * @example
 * ```typescript
 * // 基本使用
 * const result = benchmark(
 *   () => sortArray(largeArray),
 *   100,
 *   'Array sorting'
 * );
 * // 控制台输出: [Benchmark] Array sorting: 2.345ms average (100 iterations, 234ms total)
 *
 * // 使用返回的性能指标
 * const { averageTime, totalTime, iterations } = benchmark(() => {
 *   return fibonacci(20);
 * });
 * console.log(`平均时间: ${averageTime}ms`);
 * ```
 * @public
 */
export function benchmark<T>(
  fn: () => T,
  iterations: number = 1000,
  label?: string
): BenchmarkResult<T> {
  let result: T;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    result = fn();
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const averageTime = totalTime / iterations;

  if (label) {
    console.log(
      `[Benchmark] ${label}: ${Math.round(averageTime * 1000) / 1000}ms average (${iterations} iterations, ${Math.round(totalTime)}ms total)`
    );
  }

  return {
    result: result!,
    averageTime,
    totalTime,
    iterations
  };
}

/**
 * 使用性能分析API分析函数的执行情况
 *
 * 利用控制台的profile和profileEnd API（如果可用）来分析函数执行
 *
 * @param fn - 要分析的函数
 * @param label - 分析标签，用于在性能分析工具中标识
 * @returns 函数的返回值
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能分析
 *
 * @example
 * ```typescript
 * // 基本使用
 * const result = profileFn(() => {
 *   return complexOperation();
 * }, 'Complex operation');
 *
 * // 在Chrome DevTools的Performance面板中查看分析结果
 * ```
 * @public
 */
export function profileFn<T>(fn: () => T, label?: string): T {
  const name = label || 'ProfiledFunction';

  if (typeof console.profile === 'function') {
    console.profile(name);
  } else {
    console.log(`[Profile] Start: ${name}`);
  }

  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();

  if (typeof console.profileEnd === 'function') {
    console.profileEnd();
  } else {
    console.log(
      `[Profile] End: ${name} (${Math.round(endTime - startTime)}ms)`
    );
  }

  return result;
}
