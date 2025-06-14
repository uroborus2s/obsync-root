/**
 * 提供异步任务队列功能
 *
 * 此模块实现了一个可控制的异步任务队列，支持添加任务、暂停/恢复队列处理、
 * 控制最大并发数等功能，适用于需要限制并发任务数量的场景。
 *
 * @packageDocumentation
 */

/**
 * 任务队列接口
 *
 * 定义了异步任务队列的公共方法和属性。
 *
 * @typeParam T - 队列接收的任务类型
 * @typeParam R - 任务执行结果的类型
 * @public
 */
export interface Queue<T, R> {
  /**
   * 添加任务到队列
   *
   * @param task - 要添加的任务
   * @returns Promise，解析为任务的执行结果
   */
  push(task: T): Promise<R>;

  /**
   * 批量添加任务到队列
   *
   * @param tasks - 任务数组
   * @returns Promise数组，每个Promise解析为对应任务的执行结果
   */
  pushAll(tasks: T[]): Promise<R>[];

  /**
   * 返回Promise，在队列清空且所有任务完成时解析
   *
   * @returns 空Promise
   */
  drain(): Promise<void>;

  /**
   * 暂停队列处理
   * 暂停后不会处理新任务，但已经开始处理的任务会继续执行完成
   */
  pause(): void;

  /**
   * 恢复队列处理
   * 恢复后会继续处理队列中的任务
   */
  resume(): void;

  /**
   * 返回队列中待处理任务数量
   *
   * @returns 待处理任务数量
   */
  size(): number;

  /**
   * 清空队列
   * 移除所有等待中的任务，已开始执行的任务不受影响
   */
  clear(): void;
}

/**
 * 队列任务项
 *
 * @typeParam T - 任务类型
 * @typeParam R - 任务执行结果类型
 * @private
 */
interface QueueItem<T, R> {
  task: T;
  resolve: (value: R) => void;
  reject: (error: any) => void;
}

/**
 * 创建一个队列，用于管理并发异步任务
 *
 * 此函数创建一个任务队列，可以添加异步任务并控制同时执行的任务数量。
 * 当任务添加到队列中后，会在资源可用时自动开始执行。可以暂停和恢复队列，
 * 以及等待队列中所有任务完成。
 *
 * @example
 * ```typescript
 * // 基本使用 - 创建HTTP请求队列，限制并发数为2
 * const fetchQueue = queue(async (url) => {
 *   const response = await fetch(url);
 *   return response.json();
 * }, 2);
 *
 * // 添加任务到队列
 * const userDataPromise = fetchQueue.push('https://api.example.com/user/1');
 * const postsPromise = fetchQueue.push('https://api.example.com/posts');
 *
 * // 等待特定任务完成
 * const userData = await userDataPromise;
 *
 * // 批量添加任务
 * const urls = [
 *   'https://api.example.com/comments',
 *   'https://api.example.com/categories'
 * ];
 * const promises = fetchQueue.pushAll(urls);
 *
 * // 等待队列清空
 * await fetchQueue.drain();
 * console.log('所有请求已完成');
 *
 * // 暂停和恢复
 * fetchQueue.pause();
 * fetchQueue.push('https://api.example.com/delayed'); // 会被加入队列但不会立即执行
 * // ...一些操作
 * fetchQueue.resume(); // 恢复处理，开始执行队列中的任务
 * ```
 *
 * @typeParam T - 任务类型
 * @typeParam R - 任务执行结果类型
 * @param worker - 处理队列任务的异步函数
 * @param concurrency - 并发执行的最大任务数，默认为1
 * @returns 队列对象
 * @throws `TypeError` 如果worker不是函数或concurrency不是正数
 * @public
 * @remarks
 * 分类: 队列控制
 * 浏览器支持: 完全支持
 */
export function queue<T, R>(
  worker: (task: T) => Promise<R>,
  concurrency: number = 1
): Queue<T, R> {
  // 参数验证
  if (typeof worker !== 'function') {
    throw new TypeError('Expected worker to be a function');
  }

  if (typeof concurrency !== 'number' || concurrency < 1) {
    throw new TypeError('Expected concurrency to be a positive number');
  }

  // 任务队列和状态
  const tasks: QueueItem<T, R>[] = [];
  let activeCount = 0;
  let isPaused = false;
  let drainResolver: (() => void) | null = null;

  /**
   * 处理下一个任务
   * @private
   */
  function processNext(): void {
    // 如果已暂停或没有更多任务或活动任务数量已达到并发限制，则不处理
    if (isPaused || tasks.length === 0 || activeCount >= concurrency) {
      return;
    }

    // 获取下一个任务
    const item = tasks.shift()!;
    activeCount++;

    // 执行任务
    Promise.resolve()
      .then(() => worker(item.task))
      .then(
        // 任务成功
        (result) => {
          activeCount--;
          item.resolve(result);

          // 检查是否所有任务已完成
          checkDrain();

          // 处理下一个任务
          processNext();
        },
        // 任务失败
        (error) => {
          activeCount--;
          item.reject(error);

          // 检查是否所有任务已完成
          checkDrain();

          // 处理下一个任务
          processNext();
        }
      );
  }

  /**
   * 检查队列是否已清空并触发drain事件
   * @private
   */
  function checkDrain(): void {
    if (drainResolver && tasks.length === 0 && activeCount === 0) {
      drainResolver();
      drainResolver = null;
    }
  }

  // 队列接口实现
  return {
    push(task: T): Promise<R> {
      return new Promise<R>((resolve, reject) => {
        // 添加任务到队列
        tasks.push({ task, resolve, reject });

        // 尝试处理新任务
        processNext();
      });
    },

    pushAll(tasks: T[]): Promise<R>[] {
      return tasks.map((task) => this.push(task));
    },

    drain(): Promise<void> {
      // 如果队列为空且没有活动任务，立即解析
      if (tasks.length === 0 && activeCount === 0) {
        return Promise.resolve();
      }

      // 否则返回Promise，在队列清空时解析
      return new Promise<void>((resolve) => {
        drainResolver = resolve;
      });
    },

    pause(): void {
      isPaused = true;
    },

    resume(): void {
      if (isPaused) {
        isPaused = false;

        // 恢复时，尝试处理队列中的任务
        let i = 0;
        while (i < concurrency) {
          processNext();
          i++;
        }
      }
    },

    size(): number {
      return tasks.length;
    },

    clear(): void {
      tasks.length = 0;
    }
  };
}
