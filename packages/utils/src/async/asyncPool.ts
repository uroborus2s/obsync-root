/**
 * 异步池相关函数
 */

/**
 * 创建一个异步池，限制并发执行任务
 * @param limit 最大并发数
 * @param array 输入数组
 * @param iteratee 异步迭代函数，应用于每个数组元素
 * @returns 所有任务结果的数组
 */
export async function asyncPool<T, R>(
  limit: number,
  array: T[],
  iteratee: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  // 参数验证
  if (typeof limit !== 'number' || limit < 1) {
    throw new TypeError('Expected limit to be a positive number');
  }

  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (typeof iteratee !== 'function') {
    throw new TypeError('Expected iteratee to be a function');
  }

  // 如果数组为空，直接返回空数组
  if (array.length === 0) {
    return [];
  }

  // 创建结果数组和执行中的Promise池
  const results: R[] = new Array(array.length);
  const pool: Promise<void>[] = [];

  // 处理单个任务的函数
  async function processTask(index: number): Promise<void> {
    try {
      results[index] = await iteratee(array[index], index);
    } catch (error) {
      throw error;
    }
  }

  // 遍历数组项，控制并发执行
  for (let i = 0; i < array.length; i++) {
    // 创建当前任务的Promise
    const task = processTask(i);

    // 将任务加入池中
    pool.push(task);

    // 如果池中任务数量达到了并发限制，或者是最后一个任务
    if (pool.length >= limit || i === array.length - 1) {
      // 等待一个任务完成
      await Promise.race(pool).catch((error) => {
        // 任务失败，清空池子以停止所有未完成的任务
        pool.length = 0;
        throw error;
      });

      // 移除已完成的任务
      const poolWithoutCompleted = pool.filter(
        (p) => !p.hasOwnProperty('_completed')
      );
      pool.length = 0;
      pool.push(...poolWithoutCompleted);
    }
  }

  // 等待所有剩余任务完成
  if (pool.length > 0) {
    await Promise.all(pool);
  }

  return results;
}
