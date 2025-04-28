/**
 * 并发控制相关函数
 */

/**
 * 并行执行异步任务，但限制最大并发数
 * @param tasks 返回Promise的函数数组
 * @param limit 最大并发数
 * @returns 包含所有任务结果的Promise数组
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

  // 创建执行器函数
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
