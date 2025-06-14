/**
 * 提供异步瀑布流执行功能
 *
 * 此模块实现了瀑布流式的异步任务执行，每个任务依赖前一个任务的结果作为输入，
 * 适用于需要串行处理且后续步骤依赖前面步骤结果的场景。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 流程控制
 *
 * @packageDocumentation
 */

/**
 * 按顺序执行异步函数，每个函数的结果作为下一个函数的输入
 *
 * 此函数接收一个异步函数数组，并按顺序执行它们。第一个函数不接收参数，
 * 后续每个函数都接收前一个函数的返回值作为参数。整个流程的结果是最后一个
 * 函数的返回值。如果任何一个函数抛出异常，整个流程会立即中断并抛出该异常。
 *
 * @typeParam T - 最终结果的类型
 * @param tasks - 异步函数数组，每个函数接收前一个函数的结果
 * @returns Promise，解析为最后一个任务的结果
 * @throws `TypeError` 如果tasks不是数组
 * @throws `Error` 如果tasks数组为空
 * @throws `TypeError` 如果任何一项不是函数
 * @throws 如果任何一个任务执行失败，整个流程都会失败
 * @remarks
 * 版本: 1.0.0
 * 分类: 流程控制
 *
 * @example
 * ```typescript
 * // 基本使用
 * const result = await waterfall([
 *   async () => {
 *     // 第一个任务不接收参数
 *     return await fetchUser(1);
 *   },
 *   async (user) => {
 *     // 第二个任务接收第一个任务的结果
 *     return await fetchUserPosts(user.id);
 *   },
 *   async (posts) => {
 *     // 第三个任务接收第二个任务的结果
 *     return await processPostData(posts);
 *   }
 * ]);
 *
 * // 错误处理
 * try {
 *   const result = await waterfall([
 *     async () => { return 'step 1 result'; },
 *     async (result) => { throw new Error('步骤2失败'); },
 *     async (result) => { return 'step 3 result'; }
 *   ]);
 * } catch (error) {
 *   console.error('瀑布流执行失败:', error.message);
 *   // 整个流程失败，不会执行步骤3
 * }
 * ```
 * @public
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
