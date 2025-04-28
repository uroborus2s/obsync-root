/**
 * 函数性能分析工具
 */

/**
 * 分析函数性能并输出结果
 * @param fn 要分析的函数
 * @param label 分析标签（可选）
 * @returns 函数的返回值
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
