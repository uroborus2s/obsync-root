/**
 * 异步任务队列相关函数
 */

/**
 * 任务队列接口
 */
export interface Queue<T, R> {
  /**
   * 添加任务到队列
   * @param task 任务
   * @returns Promise，解析为任务的执行结果
   */
  push(task: T): Promise<R>;

  /**
   * 批量添加任务到队列
   * @param tasks 任务数组
   * @returns Promise数组，每个Promise解析为对应任务的执行结果
   */
  pushAll(tasks: T[]): Promise<R>[];

  /**
   * 返回Promise，在队列清空时解析
   * @returns 空Promise
   */
  drain(): Promise<void>;

  /**
   * 暂停队列处理
   */
  pause(): void;

  /**
   * 恢复队列处理
   */
  resume(): void;

  /**
   * 返回队列中待处理任务数量
   * @returns 待处理任务数量
   */
  size(): number;

  /**
   * 清空队列
   */
  clear(): void;
}

/**
 * 队列任务项
 */
interface QueueItem<T, R> {
  task: T;
  resolve: (value: R) => void;
  reject: (error: any) => void;
}

/**
 * 创建一个队列，用于管理并发异步任务
 * @param worker 处理队列任务的异步函数
 * @param concurrency 并发执行的最大任务数
 * @returns 队列对象
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

  // 处理下一个任务
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

  // 检查队列是否已清空
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
