/**
 * 批处理和并发控制相关函数
 */

/**
 * 批处理选项接口
 */
export interface BatchOptions {
  maxBatchSize?: number; // 每批最大项数
  maxDelay?: number; // 最大延迟时间(ms)
}

/**
 * 批处理任务队列项接口
 */
interface BatchQueueItem<T, R> {
  item: T;
  resolve: (value: R) => void;
  reject: (error: any) => void;
}

/**
 * 创建批处理函数
 * @param fn 处理批量项的函数
 * @param options 批处理选项
 * @returns 处理单个项的函数，内部会批量处理
 */
export function batch<T, R>(
  fn: (items: T[]) => Promise<R[]>,
  options: BatchOptions = {}
): (item: T) => Promise<R> {
  const { maxBatchSize = 100, maxDelay = 10 } = options;
  let queue: BatchQueueItem<T, R>[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  // 处理队列的函数
  async function processQueue() {
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
          `Batch function returned ${results.length} results for ${items.length} items`
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

/**
 * 限制并发的异步函数
 * @param fn 要限制并发的异步函数
 * @param maxConcurrent 最大并发数
 * @returns 受限的异步函数
 */
export function limitConcurrency<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
  maxConcurrent: number
): (...args: A) => Promise<T> {
  if (maxConcurrent <= 0) {
    throw new Error('maxConcurrent must be greater than 0');
  }

  let activeCount = 0;
  const queue: {
    args: A;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
  }[] = [];

  // 处理下一个队列项
  function processNext() {
    if (activeCount < maxConcurrent && queue.length > 0) {
      const { args, resolve, reject } = queue.shift()!;
      activeCount++;

      void executeTask(args, resolve, reject);
    }
  }

  // 执行任务
  async function executeTask(
    args: A,
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void
  ) {
    try {
      const result = await fn(...args);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      activeCount--;
      processNext();
    }
  }

  // 返回限制并发的函数
  return function (this: any, ...args: A): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push({ args, resolve, reject });
      processNext();
    });
  };
}
