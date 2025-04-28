/**
 * 基础检查类函数
 */

/**
 * 检查值是否为null或undefined
 * @param value 需要检查的值
 * @returns 如果值为null或undefined则返回true，否则返回false
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查值是否为null、undefined或空（空字符串、空数组、空对象）
 * @param value 要检查的值
 * @returns 如果值为null、undefined或空则返回true，否则返回false
 */
export function isNilOrEmpty(value: unknown): boolean {
  if (isNil(value)) return true;

  if (typeof value === 'string' && value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (value instanceof Map && value.size === 0) return true;
  if (value instanceof Set && value.size === 0) return true;

  if (typeof value === 'object' && Object.keys(value as object).length === 0) {
    return true;
  }

  return false;
}

/**
 * 检查值是否存在且非空
 * @param value 要检查的值
 * @returns 如果值存在且非空则返回true，否则返回false
 */
export function isPresent(value: unknown): boolean {
  return !isNilOrEmpty(value);
}

/**
 * 安全执行函数，出错时返回默认值
 * @param fn 需要执行的函数
 * @param defaultValue 出错时返回的默认值
 * @returns 函数执行结果或默认值
 */
export function safeExecute<T, D = undefined>(
  fn: () => T,
  defaultValue?: D
): T | D {
  try {
    return fn();
  } catch (error) {
    return defaultValue as D;
  }
}

/**
 * 安全执行异步函数，出错时返回默认值
 * @param fn 需要执行的异步函数
 * @param defaultValue 出错时返回的默认值
 * @returns Promise，解析为函数执行结果或默认值
 */
export async function safeExecuteAsync<T, D = undefined>(
  fn: () => Promise<T>,
  defaultValue?: D
): Promise<T | D> {
  try {
    return await fn();
  } catch (error) {
    return defaultValue as D;
  }
}
