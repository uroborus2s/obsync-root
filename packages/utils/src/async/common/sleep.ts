/**
 * 异步延迟函数，创建一个在指定时间后解析的Promise
 *
 * 此函数使用Promise和setTimeout实现异步延迟，可用于暂停异步函数执行，
 * 实现轮询间隔，或在操作之间添加延迟。
 *
 * @param ms - 延迟的毫秒数
 * @returns Promise，在指定时间后解析为void
 * @throws 不会抛出异常
 * @remarks
 * 版本: 1.0.0
 * 分类: 计时器
 *
 * @example
 * ```typescript
 * // 基本使用
 * async function demo() {
 *   console.log('开始');
 *   await sleep(2000); // 暂停2秒
 *   console.log('2秒后继续');
 * }
 *
 * // 与其他异步操作结合
 * async function fetchWithRetry(url: string) {
 *   try {
 *     return await fetch(url);
 *   } catch (err) {
 *     await sleep(1000); // 失败后等待1秒
 *     return fetch(url); // 重试
 *   }
 * }
 * ```
 * @public
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
