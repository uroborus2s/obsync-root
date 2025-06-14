/**
 * 提供并行执行异步任务的控制功能
 *
 * 此模块实现了执行多个异步任务的功能，并可以限制同时执行的最大任务数量，
 * 避免系统资源过载的同时保持较高的执行效率。
 *
 * @packageDocumentation
 */

/**
 * 并行执行异步任务，同时限制最大并发数
 *
 * 此函数接收一个异步任务数组，并控制同时执行的任务数量。当任务数量超过
 * 指定的并发限制时，将等待部分任务完成后再执行新任务。返回的结果顺序与输入任务顺序一致。
 *
 * @example
 * ```typescript
 * // 基本使用 - 并发获取多个API，限制并发数为2
 * const fetchApis = [
 *   () => fetch('https://api.example.com/users').then(r => r.json()),
 *   () => fetch('https://api.example.com/posts').then(r => r.json()),
 *   () => fetch('https://api.example.com/comments').then(r => r.json()),
 *   () => fetch('https://api.example.com/todos').then(r => r.json())
 * ];
 *
 * const results = await parallelLimit(fetchApis, 2);
 * // results包含所有API结果的数组，顺序与fetchApis相同
 *
 * // 错误处理
 * const tasksWithErrors = [
 *   async () => { return 'task1' },
 *   async () => { throw new Error('任务2失败') },
 *   async () => { return 'task3' }
 * ];
 *
 * try {
 *   const results = await parallelLimit(tasksWithErrors, 2);
 * } catch (error) {
 *   console.error('任务执行失败:', error.message);
 *   // 任何一个任务失败，整个操作都会失败
 * }
 * ```
 *
 * @typeParam T - 任务返回值的类型
 * @param tasks - 返回Promise的函数数组
 * @param limit - 最大并发数，必须大于0
 * @returns Promise，解析为所有任务结果的数组，与任务顺序相同
 * @throws `TypeError` 如果tasks不是数组或limit不是正数
 * @throws 如果任何一个任务失败，整个操作都会失败
 * @remarks
 * 版本: 1.0.0
 * 分类: 并发控制
 *
 * @public
 */
export async function parallelLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  // 参数验证
  if (!Array.isArray(tasks)) {
    throw new TypeError('Expected tasks to be an array');
  }

  if (typeof limit !== 'number' || limit < 1) {
    throw new TypeError('Expected limit to be a positive number');
  }

  // 如果没有任务，直接返回空数组
  if (tasks.length === 0) {
    return [];
  }

  // 如果limit大于任务数量，直接使用Promise.all并行执行所有任务
  if (limit >= tasks.length) {
    return Promise.all(tasks.map((task) => task()));
  }

  const results: T[] = new Array(tasks.length);
  const executing: Promise<void>[] = [];
  let index = 0;

  /**
   * 创建执行器函数，负责执行任务并维护执行队列
   * @returns Promise，完成后继续执行下一个任务
   */
  const enqueue = async (): Promise<void> => {
    // 获取当前任务索引，并递增索引
    const taskIndex = index++;

    // 如果索引超出任务范围，不执行
    if (taskIndex >= tasks.length) return;

    // 执行当前任务
    try {
      results[taskIndex] = await tasks[taskIndex]();
    } catch (error) {
      // 遇到错误，立即抛出
      throw error;
    }

    // 继续执行下一个任务
    return enqueue();
  };

  // 初始化执行limit个任务
  for (let i = 0; i < limit && i < tasks.length; i++) {
    const execPromise = enqueue();
    // 任务完成后从executing数组中移除
    execPromise
      .catch(() => {})
      .finally(() => {
        const index = executing.indexOf(execPromise);
        if (index >= 0) {
          executing.splice(index, 1);
        }
      });
    executing.push(execPromise);
  }

  // 等待所有任务完成
  await Promise.all(executing);

  return results;
}
