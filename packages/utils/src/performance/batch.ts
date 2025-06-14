/**
 * @remarks
 * 模块: 
 *
 * 批处理相关函数，提供批量处理数据的工具函数
 *
 * 提供批量处理数据的工具函数，用于优化需要重复处理的操作，减少网络请求或资源消耗。
 * 可用于将多个单一操作合并为批量操作，显著提高性能并减少资源使用。
 *
 * @remarks
 * 版本: 1.0.0
 *
 * @packageDocumentation
 */

// 导入从async/concurrency模块的limitConcurrency函数，仅供内部使用

/**
 * 批处理选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 批处理
 *
 * @public
 */
export interface BatchOptions {
  /**
   * 每批最大项数
   * @defaultValue 100
   */
  maxBatchSize?: number;

  /**
   * 最大延迟时间(毫秒)，超过此时间将执行批处理，即使未达到最大批量
   * @defaultValue 10
   */
  maxDelay?: number;
}

/**
 * 批处理任务队列项接口
 * @internal
 */
interface BatchQueueItem<T, R> {
  /** 要处理的单个项 */
  item: T;
  /** 解析Promise的函数 */
  resolve: (value: R) => void;
  /** 拒绝Promise的函数 */
  reject: (error: any) => void;
}

/**
 * 创建批处理函数，将多个单项操作合并为批量操作
 *
 * 此函数将单个项的处理转换为批量处理，当累积足够的项或达到指定的延迟时间时，
 * 会自动触发批量处理。适用于优化API请求或数据库操作等场景。
 *
 * @typeParam T - 单个项的类型
 * @typeParam R - 处理结果的类型
 * @param fn - 处理批量项的函数，接收项数组，返回结果数组
 * @param options - 批处理选项
 * @returns 处理单个项的函数，内部会批量处理
 * @throws `Error` 如果批处理函数返回的结果数量与输入项数量不匹配
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能优化
 *
 * @example
 * ```typescript
 * // 基本使用 - 将单个API请求合并为批量请求
 * const batchFetchUser = batch(
 *   async (userIds) => {
 *     // 一次请求获取多个用户
 *     const response = await fetch(`/api/users?ids=${userIds.join(',')}`);
 *     return response.json();
 *   },
 *   { maxBatchSize: 50, maxDelay: 20 }
 * );
 *
 * // 现在可以单独调用，但内部会合并请求
 * const user1 = await batchFetchUser(101);
 * const user2 = await batchFetchUser(102);
 * const user3 = await batchFetchUser(103);
 * // 这些请求会合并为一个批量请求
 *
 * // 自定义批量选项
 * const batchInsert = batch(
 *   async (records) => {
 *     // 批量插入数据库
 *     const results = await db.batchInsert('users', records);
 *     return results.map(r => r.id);
 *   },
 *   { maxBatchSize: 500, maxDelay: 50 }
 * );
 *
 * // 错误处理
 * try {
 *   const id = await batchInsert({ name: 'Test' });
 * } catch (error) {
 *   // 如果批处理中有一个项失败，所有相关项都会失败
 *   console.error('批量插入失败:', error);
 * }
 * ```
 * @public
 */
export function batch<T, R>(
  fn: (items: T[]) => Promise<R[]>,
  options: BatchOptions = {}
): (item: T) => Promise<R> {
  const { maxBatchSize = 100, maxDelay = 10 } = options;
  let queue: BatchQueueItem<T, R>[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 处理队列中的项
   * @internal
   */
  async function processQueue(): Promise<void> {
    const currentQueue = queue;
    queue = [];
    timer = null;

    if (currentQueue.length === 0) {
      return;
    }

    const items = currentQueue.map((q) => q.item);

    try {
      const results = await fn(items);

      // 确保结果数组长度与请求数组匹配
      if (results.length !== items.length) {
        const error = new Error(
          `批处理函数返回了 ${results.length} 个结果，但提供了 ${items.length} 个项`
        );
        currentQueue.forEach(({ reject }) => reject(error));
        return;
      }

      // 将结果分配给相应的Promise
      results.forEach((result, index) => {
        currentQueue[index].resolve(result);
      });
    } catch (error) {
      // 在出错的情况下，拒绝所有Promise
      currentQueue.forEach(({ reject }) => reject(error));
    }
  }

  // 返回单个项处理函数
  return (item: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      // 将项添加到队列
      queue.push({ item, resolve, reject });

      // 如果队列已满，立即处理
      if (queue.length >= maxBatchSize) {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        void processQueue();
        return;
      }

      // 否则，设置一个定时器以确保项目最终会被处理
      if (timer === null) {
        timer = setTimeout(() => {
          void processQueue();
        }, maxDelay);
      }
    });
  };
}
