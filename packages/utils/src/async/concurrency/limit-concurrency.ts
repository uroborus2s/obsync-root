/**
 * 提供函数调用并发限制功能
 *
 * 此模块实现了对任意异步函数的并发调用进行限制的功能，确保任何时候
 * 最多只有指定数量的函数调用同时执行，超出的调用会被放入队列等待。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 并发控制
 *
 * @packageDocumentation
 */

/**
 * 限制异步函数的并发执行数量
 *
 * 此函数接收一个异步函数和最大并发数，返回一个新函数，调用新函数时如果
 * 当前活跃的调用数已达到最大并发数，则会将新的调用放入队列等待，直到有
 * 调用完成后才会执行队列中等待的调用。
 *
 * @typeParam T - 异步函数返回值的类型
 * @typeParam A - 异步函数参数类型的元组
 * @param fn - 要限制并发的异步函数
 * @param maxConcurrent - 最大并发数，必须大于0
 * @returns 具有相同签名但并发受限的新函数
 * @throws `Error` 如果maxConcurrent不是正数
 * @remarks
 * 版本: 1.0.0
 * 分类: 并发控制
 *
 * @example
 * ```typescript
 * // 基本使用 - 限制API请求并发数
 * const fetchWithLimit = limitConcurrency(
 *   async (url) => {
 *     const response = await fetch(url);
 *     return response.json();
 *   },
 *   3 // 最多同时执行3个请求
 * );
 *
 * // 现在可以随意调用，但最多只会有3个并发请求
 * const results = await Promise.all([
 *   fetchWithLimit('https://api.example.com/users'),
 *   fetchWithLimit('https://api.example.com/posts'),
 *   fetchWithLimit('https://api.example.com/comments'),
 *   fetchWithLimit('https://api.example.com/todos'),
 *   fetchWithLimit('https://api.example.com/photos')
 * ]);
 *
 * // 错误处理
 * try {
 *   const data = await fetchWithLimit('https://api.example.com/invalid');
 * } catch (error) {
 *   console.error('请求失败但不会影响队列中其他请求:', error);
 * }
 * ```
 * @public
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

  /**
   * 处理队列中的下一个任务
   */
  function processNext(): void {
    if (activeCount < maxConcurrent && queue.length > 0) {
      const { args, resolve, reject } = queue.shift()!;
      activeCount++;

      executeTask(args, resolve, reject);
    }
  }

  /**
   * 执行任务并处理结果
   */
  async function executeTask(
    args: A,
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void
  ): Promise<void> {
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
      // 如果当前活跃任务数小于最大并发数，直接执行
      if (activeCount < maxConcurrent) {
        activeCount++;
        executeTask(args, resolve, reject);
      } else {
        // 否则加入队列等待执行
        queue.push({ args, resolve, reject });
      }
    });
  };
}
