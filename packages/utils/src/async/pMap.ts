/**
 * 并发映射函数
 */

/**
 * 并发映射选项
 */
export interface PMapOptions {
  /** 并发限制，默认为无限 */
  concurrency?: number;
}

/**
 * 将数组中的每个项目映射到异步函数，并控制并发执行
 * @param array 要映射的数组
 * @param mapper 异步映射函数，接收数组元素、索引和原数组
 * @param options 配置选项
 * @returns 映射结果的数组
 */
export async function pMap<T, R>(
  array: T[],
  mapper: (item: T, index: number, array: T[]) => Promise<R>,
  options: PMapOptions = {}
): Promise<R[]> {
  // 参数验证
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (typeof mapper !== 'function') {
    throw new TypeError('Expected mapper to be a function');
  }

  const { concurrency = Infinity } = options;

  if (typeof concurrency !== 'number' || concurrency < 1) {
    throw new TypeError('Expected concurrency to be a positive number');
  }

  // 如果数组为空，直接返回空数组
  if (array.length === 0) {
    return [];
  }

  // 如果没有并发限制，直接使用Promise.all
  if (!Number.isFinite(concurrency) || concurrency >= array.length) {
    return Promise.all(array.map((item, index) => mapper(item, index, array)));
  }

  const results: R[] = new Array(array.length);
  const executing: Set<Promise<void>> = new Set();

  async function execute(index: number): Promise<void> {
    const item = array[index];
    try {
      results[index] = await mapper(item, index, array);
    } catch (error) {
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    let currentIndex = 0;

    // 检查是否所有任务已完成
    function onTaskComplete(): void {
      if (currentIndex === array.length && executing.size === 0) {
        resolve(results);
      }
    }

    // 启动新任务
    function next(): void {
      // 如果所有任务已分配，检查是否已全部完成
      if (currentIndex === array.length) {
        onTaskComplete();
        return;
      }

      // 如果正在执行的任务数量达到并发限制，不启动新任务
      if (executing.size >= concurrency) {
        return;
      }

      const index = currentIndex++;
      const promise = execute(index);

      // 将任务添加到执行中集合
      executing.add(promise);

      // 任务完成后从执行中集合移除
      promise
        .then(() => {
          executing.delete(promise);
          next();
          onTaskComplete();
        })
        .catch((error) => {
          executing.delete(promise);
          reject(error);
        });

      // 如果可以，递归启动下一个任务
      if (executing.size < concurrency && currentIndex < array.length) {
        next();
      }
    }

    // 初始启动最多concurrency个任务
    for (let i = 0; i < concurrency && i < array.length; i++) {
      next();
    }
  });
}
