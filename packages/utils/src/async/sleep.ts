/**
 * 延迟函数
 */

/**
 * 延迟指定时间后解析Promise
 * @param ms 延迟的毫秒数
 * @returns Promise，在指定时间后解析
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
