/**
 * 超时控制相关函数
 */

/**
 * 创建超时Promise
 * @param ms 超时毫秒数
 * @param message 超时错误消息
 * @returns 超时后拒绝的Promise
 */
export function timeout(
  ms: number,
  message: string = '操作超时'
): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * 为Promise添加超时控制
 * @param promise 原始Promise
 * @param ms 超时毫秒数
 * @param message 超时错误消息
 * @returns 带超时控制的Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = '操作超时'
): Promise<T> {
  return Promise.race([promise, timeout(ms, message)]);
}
