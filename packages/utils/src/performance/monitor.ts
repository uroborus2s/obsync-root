/**
 * 资源监控相关函数
 */

/**
 * 内存使用情况接口
 */
export interface MemoryUsage {
  rss: number; // 常驻集大小（字节）
  heapTotal: number; // V8引擎分配的总内存（字节）
  heapUsed: number; // V8引擎实际使用的内存（字节）
  external?: number; // V8管理的绑定到JavaScript的C++对象的内存（字节）
  arrayBuffers?: number; // 分配给ArrayBuffer和SharedArrayBuffer的内存（字节）
}

/**
 * CPU使用情况接口
 */
export interface CPUUsage {
  user: number; // 用户CPU时间（微秒）
  system: number; // 系统CPU时间（微秒）
  percentage: number; // CPU使用百分比（0-100）
}

/**
 * 资源使用情况接口
 */
export interface ResourceUsage {
  memory: MemoryUsage;
  cpu: CPUUsage;
}

/**
 * 获取当前进程的内存使用情况
 * @returns 内存使用对象，或在不支持的环境中返回null
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
 * @returns 解析为CPU使用对象的Promise，或在不支持的环境中返回null
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
 * 获取当前进程的资源使用情况（内存和CPU）
 * @returns 解析为资源使用情况对象的Promise，或在不支持的环境中返回null
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
 * 持续监控资源使用情况，定期调用回调函数
 * @param callback 回调函数，接收资源使用情况对象
 * @param interval 监控间隔（毫秒，默认为5000）
 * @returns 一个对象，包含stop方法用于停止监控
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
