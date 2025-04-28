/**
 * 性能测量相关函数
 */

/**
 * 测量函数执行时间
 * @param fn 要测量的函数
 * @param label 测量标签（可选），用于在日志中标识
 * @returns 函数的返回值
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
 * @param label 计时器标签（可选），用于在日志中标识
 * @returns 一个对象，包含stop方法，调用该方法停止计时并返回经过的毫秒数
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
 */
export interface BenchmarkResult<T> {
  result: T;
  averageTime: number;
  totalTime: number;
  iterations: number;
}

/**
 * 对函数进行基准测试，多次运行并计算平均执行时间
 * @param fn 要测试的函数
 * @param iterations 迭代次数（可选，默认为1000）
 * @param label 测试标签（可选）
 * @returns 包含测试结果的对象
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
 * @param fn 要分析的函数
 * @param label 分析标签（可选）
 * @returns 函数的返回值
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
