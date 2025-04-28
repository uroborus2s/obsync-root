/**
 * 通用工具函数
 */

/**
 * 空操作函数，不执行任何操作
 */
export function noop(): void {
  // 不执行任何操作
}

/**
 * 恒等函数，返回输入的参数
 * @param value 输入值
 * @returns 返回输入的相同值
 */
export function identity<T>(value: T): T {
  return value;
}
