/**
 * @stratix/queue 性能监控工具
 * 提供队列性能测试和监控功能
 */

/**
 * 性能测量结果接口
 */
export interface PerformanceResult {
  operation: string; // 操作名称
  duration: number; // 持续时间（毫秒）
  success: boolean; // 是否成功
  timestamp: Date; // 时间戳
  metadata?: any; // 额外元数据
}

/**
 * 性能统计接口
 */
export interface PerformanceStats {
  operation: string; // 操作名称
  totalCount: number; // 总操作次数
  successCount: number; // 成功次数
  failureCount: number; // 失败次数
  minDuration: number; // 最小持续时间
  maxDuration: number; // 最大持续时间
  avgDuration: number; // 平均持续时间
  p95Duration?: number; // 95百分位持续时间
  p99Duration?: number; // 99百分位持续时间
}

/**
 * 性能监控类
 * 用于测量和记录队列操作的性能
 */
export class PerformanceMonitor {
  private measurements: Map<string, PerformanceResult[]>;
  private maxSize: number;
  private static instance: PerformanceMonitor;

  /**
   * 私有构造函数，实现单例模式
   * @param maxSize 每个操作保存的最大记录数
   */
  private constructor(maxSize: number = 1000) {
    this.measurements = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 获取单例实例
   * @param maxSize 每个操作保存的最大记录数
   */
  public static getInstance(maxSize: number = 1000): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(maxSize);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 记录操作性能
   * @param operation 操作名称
   * @param callback 要测量的异步操作
   * @param metadata 额外元数据
   * @returns 操作的返回值
   */
  public async measure<T>(
    operation: string,
    callback: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let result: T;

    try {
      result = await callback();
      success = true;
      return result;
    } finally {
      const duration = Date.now() - startTime;
      this.recordMeasurement({
        operation,
        duration,
        success,
        timestamp: new Date(),
        metadata
      });
    }
  }

  /**
   * 记录测量结果
   * @param result 测量结果
   */
  private recordMeasurement(result: PerformanceResult): void {
    if (!this.measurements.has(result.operation)) {
      this.measurements.set(result.operation, []);
    }

    const measurements = this.measurements.get(result.operation)!;
    measurements.push(result);

    // 限制记录数量
    if (measurements.length > this.maxSize) {
      measurements.splice(0, measurements.length - this.maxSize);
    }
  }

  /**
   * 获取操作的性能统计
   * @param operation 操作名称
   * @returns 性能统计，如果操作不存在则返回null
   */
  public getStats(operation: string): PerformanceStats | null {
    if (!this.measurements.has(operation)) {
      return null;
    }

    const measurements = this.measurements.get(operation)!;

    if (measurements.length === 0) {
      return null;
    }

    const durations = measurements.map((m) => m.duration).sort((a, b) => a - b);
    const successCount = measurements.filter((m) => m.success).length;

    const stats: PerformanceStats = {
      operation,
      totalCount: measurements.length,
      successCount,
      failureCount: measurements.length - successCount,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length
    };

    // 计算百分位数（如果有足够的样本）
    if (durations.length >= 20) {
      const p95Index = Math.floor(durations.length * 0.95);
      const p99Index = Math.floor(durations.length * 0.99);
      stats.p95Duration = durations[p95Index];
      stats.p99Duration = durations[p99Index];
    }

    return stats;
  }

  /**
   * 获取所有操作的性能统计
   * @returns 所有操作的性能统计
   */
  public getAllStats(): PerformanceStats[] {
    return Array.from(this.measurements.keys())
      .map((operation) => this.getStats(operation)!)
      .filter((stat) => stat !== null);
  }

  /**
   * 清除特定操作的测量记录
   * @param operation 操作名称
   */
  public clearStats(operation: string): void {
    this.measurements.delete(operation);
  }

  /**
   * 清除所有测量记录
   */
  public clearAllStats(): void {
    this.measurements.clear();
  }
}

// 创建默认实例
export const defaultPerformanceMonitor = PerformanceMonitor.getInstance();

/**
 * 性能测试函数
 * 测试队列操作的性能
 * @param name 测试名称
 * @param operation 要测试的操作函数
 * @param iterations 迭代次数
 * @param concurrency 并发数
 */
export async function runPerformanceTest(
  name: string,
  operation: () => Promise<any>,
  iterations: number = 100,
  concurrency: number = 1
): Promise<PerformanceStats> {
  console.log(
    `开始性能测试: ${name} (${iterations} 次迭代, 并发度 ${concurrency})`
  );

  const startTime = Date.now();
  const durations: number[] = [];
  let successCount = 0;
  let failureCount = 0;

  // 创建测试批次
  const batches: number[][] = [];
  for (let i = 0; i < iterations; i += concurrency) {
    const batchSize = Math.min(concurrency, iterations - i);
    batches.push(Array(batchSize).fill(0));
  }

  // 按批次执行测试
  for (const batch of batches) {
    const promises = batch.map(async () => {
      const operationStart = Date.now();
      try {
        await operation();
        successCount++;
        return Date.now() - operationStart;
      } catch (error) {
        failureCount++;
        console.error(`测试失败:`, error);
        return -1; // 失败标记
      }
    });

    const batchDurations = await Promise.all(promises);
    durations.push(...batchDurations.filter((d) => d > 0));
  }

  // 计算统计数据
  durations.sort((a, b) => a - b);
  const totalDuration = Date.now() - startTime;
  const throughput = iterations / (totalDuration / 1000);

  const stats: PerformanceStats = {
    operation: name,
    totalCount: iterations,
    successCount,
    failureCount,
    minDuration: durations.length > 0 ? durations[0] : 0,
    maxDuration: durations.length > 0 ? durations[durations.length - 1] : 0,
    avgDuration:
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0
  };

  // 计算百分位数
  if (durations.length >= 20) {
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    stats.p95Duration = durations[p95Index];
    stats.p99Duration = durations[p99Index];
  }

  console.log(`性能测试结果: ${name}`);
  console.log(`- 总时间: ${totalDuration}ms`);
  console.log(`- 吞吐量: ${throughput.toFixed(2)} 操作/秒`);
  console.log(`- 成功率: ${((successCount / iterations) * 100).toFixed(2)}%`);
  console.log(`- 平均延迟: ${stats.avgDuration.toFixed(2)}ms`);

  if (stats.p95Duration !== undefined) {
    console.log(`- 95百分位延迟: ${stats.p95Duration.toFixed(2)}ms`);
  }

  if (stats.p99Duration !== undefined) {
    console.log(`- 99百分位延迟: ${stats.p99Duration.toFixed(2)}ms`);
  }

  return stats;
}
