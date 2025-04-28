/**
 * 瀑布流执行函数
 */

/**
 * 按顺序执行异步函数，每个函数的结果作为下一个函数的输入
 * @param tasks 异步函数数组，每个函数接收前一个函数的结果
 * @returns 最后一个任务的结果
 */
export async function waterfall<T = any>(
  tasks: Array<(arg?: any) => Promise<any>>
): Promise<T> {
  // 参数验证
  if (!Array.isArray(tasks)) {
    throw new TypeError('Expected tasks to be an array');
  }

  if (tasks.length === 0) {
    throw new Error('Expected at least one task');
  }

  // 逐步执行每个任务
  let result: any;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    if (typeof task !== 'function') {
      throw new TypeError(`Expected task ${i} to be a function`);
    }

    try {
      // 第一个任务不需要参数，后续任务使用前一个任务的结果作为参数
      if (i === 0) {
        result = await task();
      } else {
        result = await task(result);
      }
    } catch (error) {
      throw error;
    }
  }

  return result as T;
}
