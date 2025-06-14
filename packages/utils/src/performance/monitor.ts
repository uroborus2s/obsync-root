/**
 * @remarks
 * 模块: 
 *
 * 资源监控相关函数，提供内存和CPU使用情况监控工具
 *
 * 此模块提供了一系列用于监控应用程序资源使用情况的工具函数，包括内存和CPU使用情况的检测。
 * 这些工具可用于性能调优、资源泄露检测和负载监控。主要支持Node.js环境，部分API在浏览器环境中也可使用。
 *
 * @remarks
 * 版本: 1.0.0
 *
 * @example
 * ```typescript
 * import { monitorPerformance, getMemoryUsage } from '@stratix/utils/performance/monitor';
 *
 * // 获取当前内存使用情况
 * const memory = getMemoryUsage();
 * console.log(`堆内存使用: ${memory.heapUsed / 1024 / 1024} MB`);
 *
 * // 持续监控资源使用
 * const monitor = monitorPerformance((usage) => {
 *   console.log(`CPU使用率: ${usage.cpu.percentage}%`);
 *   console.log(`内存使用: ${usage.memory.heapUsed / 1024 / 1024} MB`);
 * }, 5000);
 *
 * // 停止监控
 * setTimeout(() => {
 *   monitor.stop();
 * }, 60000);
 * ```
 *
 * @packageDocumentation
 */

// 添加全局对象声明
declare const window: any | undefined;

/**
 * 内存使用情况接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 资源监控
 *
 * @public
 */
export interface MemoryUsage {
  /** 常驻集大小（字节），进程分配的内存总量 */
  rss: number;
  /** V8引擎分配的总内存（字节） */
  heapTotal: number;
  /** V8引擎实际使用的内存（字节） */
  heapUsed: number;
  /** V8管理的绑定到JavaScript的C++对象的内存（字节），可选 */
  external?: number;
  /** 分配给ArrayBuffer和SharedArrayBuffer的内存（字节），可选 */
  arrayBuffers?: number;
}

/**
 * CPU使用情况接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 资源监控
 *
 * @public
 */
export interface CPUUsage {
  /** 用户CPU时间（微秒） */
  user: number;
  /** 系统CPU时间（微秒） */
  system: number;
  /** CPU使用百分比（0-100） */
  percentage: number;
}

/**
 * 资源使用情况接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 资源监控
 *
 * @public
 */
export interface ResourceUsage {
  /** 内存使用情况 */
  memory: MemoryUsage;
  /** CPU使用情况 */
  cpu: CPUUsage;
}

/**
 * 获取当前进程的内存使用情况
 *
 * 返回当前进程的内存使用详情，包括堆内存、常驻集大小等信息
 *
 * @returns 内存使用对象，或在不支持的环境中返回null
 * @remarks
 * 版本: 1.0.0
 * 分类: 资源监控
 *
 * @example
 * ```typescript
 * // 基本使用
 * const memory = getMemoryUsage();
 * if (memory) {
 *   console.log(`总内存分配: ${memory.heapTotal / 1024 / 1024} MB`);
 *   console.log(`内存使用: ${memory.heapUsed / 1024 / 1024} MB`);
 * }
 *
 * // 监控内存泄漏
 * const initialMemory = getMemoryUsage();
 * // 执行操作
 * doSomething();
 * const finalMemory = getMemoryUsage();
 * console.log(`内存增长: ${(finalMemory.heapUsed - initialMemory.heapUsed) / 1024} KB`);
 * ```
 *
 * @public
 */
export function getMemoryUsage(): MemoryUsage | null {
  if (
    typeof process !== 'undefined' &&
    typeof process.memoryUsage === 'function'
  ) {
    // Node.js环境
    const memoryUsage = process.memoryUsage();
    return {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    };
  } else if (
    typeof window !== 'undefined' &&
    (window as any).performance &&
    (window as any).performance.memory
  ) {
    // 浏览器环境（目前只有Chrome支持）
    const memory = (window as any).performance.memory;
    return {
      rss: 0, // 浏览器环境中无法获取RSS值
      heapTotal: memory.totalJSHeapSize,
      heapUsed: memory.usedJSHeapSize
    };
  }

  return null;
}

// 上次CPU使用情况，用于计算使用率
let lastCPUUsage: { user: number; system: number; time: number } | null = null;

/**
 * 获取当前进程的CPU使用情况
 *
 * 计算并返回自上次调用以来的CPU使用率和累计使用时间
 *
 * @returns 解析为CPU使用对象的Promise，或在不支持的环境中返回null
 * @remarks
 * 版本: 1.0.0
 * 分类: 资源监控
 *
 * @example
 * ```typescript
 * // 基本使用
 * const cpuInfo = await getCPUUsage();
 * if (cpuInfo) {
 *   console.log(`CPU使用率: ${cpuInfo.percentage.toFixed(2)}%`);
 * }
 *
 * // 多次采样监控
 * setInterval(async () => {
 *   const cpu = await getCPUUsage();
 *   if (cpu && cpu.percentage > 80) {
 *     console.warn('CPU负载过高');
 *   }
 * }, 5000);
 * ```
 *
 * @public
 */
export async function getCPUUsage(): Promise<CPUUsage | null> {
  if (
    typeof process !== 'undefined' &&
    typeof process.cpuUsage === 'function'
  ) {
    // Node.js环境
    const now = Date.now();
    const cpuUsage = process.cpuUsage();

    if (lastCPUUsage === null) {
      lastCPUUsage = {
        user: cpuUsage.user,
        system: cpuUsage.system,
        time: now
      };

      // 首次调用返回0%
      return {
        user: 0,
        system: 0,
        percentage: 0
      };
    }

    const userDiff = cpuUsage.user - lastCPUUsage.user;
    const systemDiff = cpuUsage.system - lastCPUUsage.system;
    const timeDiff = now - lastCPUUsage.time;

    // 更新上次使用情况
    lastCPUUsage = {
      user: cpuUsage.user,
      system: cpuUsage.system,
      time: now
    };

    // 计算CPU使用百分比（单核）
    // 将微秒转换为毫秒，然后计算百分比
    const totalCPUTime = userDiff + systemDiff;
    const percentage = (totalCPUTime / 1000 / timeDiff) * 100;

    return {
      user: userDiff,
      system: systemDiff,
      percentage: Math.min(percentage, 100) // 确保不超过100%
    };
  }

  return null;
}

/**
 * 获取当前进程的资源使用情况，包括内存和CPU
 *
 * 同时获取内存和CPU使用情况，便于全面监控资源使用
 *
 * @returns 解析为资源使用对象的Promise，或在不支持的环境中返回null
 * @remarks
 * 版本: 1.0.0
 * 分类: 资源监控
 *
 * @example
 * ```typescript
 * // 获取完整的资源使用情况
 * const resources = await getResourceUsage();
 * if (resources) {
 *   console.log(`内存: ${resources.memory.heapUsed / 1024 / 1024} MB`);
 *   console.log(`CPU: ${resources.cpu.percentage}%`);
 * }
 * ```
 *
 * @public
 */
export async function getResourceUsage(): Promise<ResourceUsage | null> {
  const memoryUsage = getMemoryUsage();
  if (!memoryUsage) {
    return null;
  }

  const cpuUsage = await getCPUUsage();
  if (!cpuUsage) {
    return null;
  }

  return {
    memory: memoryUsage,
    cpu: cpuUsage
  };
}

/**
 * 持续监控性能并定期报告
 *
 * 设置一个定时器，定期收集资源使用情况并通过回调函数报告
 *
 * @param callback - 接收资源使用数据的回调函数
 * @param interval - 监控间隔时间（毫秒），默认为5000ms
 * @returns 包含stop方法的对象，用于停止监控
 * @remarks
 * 版本: 1.0.0
 * 分类: 资源监控
 *
 * @example
 * ```typescript
 * // 每5秒记录一次资源使用情况
 * const stopMonitoring = monitorPerformance((usage) => {
 *   console.log(`[${new Date().toISOString()}]`);
 *   console.log(`内存: ${(usage.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
 *   console.log(`CPU: ${usage.cpu.percentage.toFixed(2)}%`);
 * });
 *
 * // 一小时后停止监控
 * setTimeout(() => stopMonitoring.stop(), 3600000);
 * ```
 *
 * @public
 */
export function monitorPerformance(
  callback: (usage: ResourceUsage) => void,
  interval: number = 5000
): { stop: () => void } {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  async function monitor() {
    if (stopped) {
      return;
    }

    const usage = await getResourceUsage();

    if (usage && !stopped) {
      callback(usage);
      timeoutId = setTimeout(monitor, interval);
    } else if (!stopped) {
      // 如果无法获取资源使用情况，但监控未停止，则继续尝试
      timeoutId = setTimeout(monitor, interval);
    }
  }

  // 启动监控
  void monitor();

  return {
    stop: () => {
      stopped = true;
      clearTimeout(timeoutId);
    }
  };
}
