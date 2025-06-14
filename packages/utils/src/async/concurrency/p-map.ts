/**
 * 并发映射函数，提供对异步函数进行并发控制的能力
 *
 * 此模块实现了一个类似Array.map的功能，但支持异步映射函数和并发控制，
 * 使得可以在处理大量数据时限制同时进行的操作数量，避免资源过载。
 *
 * @packageDocumentation
 */

/**
 * 并发映射选项接口，配置映射的并发行为
 *
 * @example
 * ```typescript
 * // 限制最多5个并发请求
 * const options: PMapOptions = {
 *   concurrency: 5
 * };
 * ```
 *
 * @remarks
 * 版本: 1.0.0
 *
 * @public
 */
export interface PMapOptions {
  /**
   * 并发限制，控制同时执行的任务数量
   *
   * @remarks
   * 默认值: Infinity - 无限制，类似于Promise.all
   */
  concurrency?: number;
}

/**
 * 将数组中的每个项目映射到异步函数，并控制并发执行数量
 *
 * 类似于Array.prototype.map，但用于处理异步映射函数，并可以限制并发执行的数量。
 * 当数据量大或每个操作消耗资源较多时，控制并发数可以避免资源耗尽。
 *
 * @example
 * ```typescript
 * // 基本使用 - 并发获取多个URL，限制并发数为3
 * const urls = [
 *   'https://example.com/1',
 *   'https://example.com/2',
 *   'https://example.com/3',
 *   'https://example.com/4',
 *   'https://example.com/5'
 * ];
 *
 * const results = await pMap(
 *   urls,
 *   url => fetch(url).then(r => r.json()),
 *   { concurrency: 3 }
 * );
 *
 * // 处理数组索引
 * const items = ['a', 'b', 'c'];
 * const withIndexes = await pMap(
 *   items,
 *   async (item, index) => {
 *     return { item, index, timestamp: Date.now() };
 *   }
 * );
 *
 * // 错误处理
 * try {
 *   await pMap(apis, async (api) => {
 *     const response = await fetch(api.url);
 *     if (!response.ok) {
 *       throw new Error(`API ${api.name} failed with ${response.status}`);
 *     }
 *     return response.json();
 *   });
 * } catch (error) {
 *   // 任何一个映射函数失败，整个操作都会失败
 *   console.error('映射操作失败:', error);
 * }
 * ```
 *
 * @typeParam T - 输入数组元素的类型
 * @typeParam R - 映射结果的类型
 * @param array - 要映射的数组
 * @param mapper - 异步映射函数，接收数组元素、索引和原数组
 * @param options - 并发映射配置选项
 * @returns Promise，解析为映射结果的数组，顺序与输入数组一致
 * @throws `TypeError` 如果输入不是数组、mapper不是函数或concurrency不是正数
 * @throws 如果任何一个mapper函数执行失败，整个操作都会失败
 * @remarks
 * 版本: 1.0.0
 * 分类: 并发控制
 *
 * @public
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

  /**
   * 执行单个任务
   * @param index - 数组索引
   */
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

    /**
     * 检查是否所有任务已完成
     */
    function onTaskComplete(): void {
      if (currentIndex === array.length && executing.size === 0) {
        resolve(results);
      }
    }

    /**
     * 启动新任务
     */
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
