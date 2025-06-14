/**
 * 安全执行工具函数，提供避免异常的函数执行方式
 *
 * 此模块提供了一系列用于安全执行操作的工具函数，通过捕获可能的异常并返回默认值，
 * 避免程序因未处理的异常而崩溃。适用于处理网络请求、文件操作等可能失败的场景。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 错误处理
 *
 * @example
 * ```typescript
 * import { safeExecute, safeJsonParse } from '@stratix/utils/common/safe';
 *
 * // 安全执行可能抛出异常的函数
 * const result = safeExecute(() => JSON.parse('{"invalid": json}'), { fallback: true });
 * // 结果为 { fallback: true }
 *
 * // 安全解析JSON字符串
 * const data = safeJsonParse('{"name": "Alice"}', {});
 * // 结果为 { name: 'Alice' }
 * ```
 *
 * @packageDocumentation
 */

/**
 * 安全执行函数，捕获可能的异常并返回默认值
 *
 * 执行提供的函数，如果执行过程中抛出异常，则返回指定的默认值
 *
 * @param fn - 要执行的函数
 * @param defaultValue - 出错时返回的默认值
 * @returns 函数执行结果或默认值
 * @remarks
 * 版本: 1.0.0
 * 分类: 错误处理
 *
 * @example
 * ```typescript
 * // 基本使用
 * const result = safeExecute(() => {
 *   return localStorage.getItem('user');
 * }, null);
 * // 如果localStorage不可用，返回null
 *
 * // 处理可能出错的函数
 * const data = safeExecute(() => {
 *   if (Math.random() > 0.5) throw new Error('Random failure');
 *   return 'success';
 * }, 'failure');
 * // 50%概率返回 'success'，50%概率返回 'failure'
 * ```
 * @public
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
 * 安全执行异步函数，捕获可能的异常并返回默认值
 *
 * 执行提供的异步函数，如果执行过程中抛出异常，则返回指定的默认值
 *
 * @param fn - 要执行的异步函数
 * @param defaultValue - 出错时返回的默认值
 * @returns Promise，解析为函数执行结果或默认值
 * @remarks
 * 版本: 1.0.0
 * 分类: 错误处理
 *
 * @example
 * ```typescript
 * // 安全获取API数据
 * const data = await safeExecuteAsync(async () => {
 *   const response = await fetch('https://api.example.com/data');
 *   if (!response.ok) throw new Error('API request failed');
 *   return response.json();
 * }, { error: true });
 * // 如果请求失败，返回 { error: true }
 *
 * // 处理可能超时的操作
 * const result = await safeExecuteAsync(async () => {
 *   return await Promise.race([
 *     fetchData(),
 *     new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
 *   ]);
 * }, 'timeout');
 * // 如果操作超时，返回 'timeout'
 * ```
 * @public
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

/**
 * 安全解析JSON字符串
 *
 * 尝试解析JSON字符串，如果解析失败则返回指定的默认值
 *
 * @param json - 要解析的JSON字符串
 * @param defaultValue - 解析失败时返回的默认值
 * @returns 解析结果或默认值
 * @remarks
 * 版本: 1.0.0
 * 分类: JSON处理
 *
 * @example
 * ```typescript
 * // 解析有效的JSON字符串
 * const data = safeJsonParse('{"name": "Alice", "age": 30}', {});
 * // 输出: { name: 'Alice', age: 30 }
 *
 * // 处理无效的JSON字符串
 * const result = safeJsonParse('{"invalid": json}', { valid: false });
 * // 输出: { valid: false }
 *
 * // 解析本地存储的数据
 * const config = safeJsonParse(localStorage.getItem('config'), { theme: 'light' });
 * // 如果localStorage中无数据或数据无效，返回默认配置
 * ```
 * @public
 */
export function safeJsonParse<T = any, D = undefined>(
  json: string,
  defaultValue?: D
): T | D {
  return safeExecute<T, D>(() => JSON.parse(json) as T, defaultValue);
}

/**
 * 安全获取对象属性值
 *
 * 从对象中安全地获取嵌套属性值，如果任何中间属性为null或undefined，则返回默认值
 *
 * @param obj - 目标对象
 * @param path - 属性路径(如 'a.b.c' 或 ['a', 'b', 'c'])
 * @param defaultValue - 获取失败时返回的默认值
 * @returns 属性值或默认值
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象访问
 *
 * @example
 * ```typescript
 * // 基本使用
 * const obj = { user: { profile: { name: 'Alice' } } };
 * const name = safeGet(obj, 'user.profile.name', 'Unknown');
 * // 输出: 'Alice'
 *
 * // 处理不存在的属性
 * const address = safeGet(obj, 'user.profile.address', 'No address');
 * // 输出: 'No address'
 *
 * // 使用数组路径
 * const result = safeGet(obj, ['user', 'profile', 'name'], 'Unknown');
 * // 输出: 'Alice'
 * ```
 * @public
 */
export function safeGet<T = any, D = undefined>(
  obj: any,
  path: string | Array<string>,
  defaultValue?: D
): T | D {
  return safeExecute<T, D>(() => {
    const segments = Array.isArray(path) ? path : path.split('.');
    let current = obj;
    let pathValid = true;

    for (const key of segments) {
      if (current === null || current === undefined) {
        pathValid = false;
        break;
      }
      current = current[key];
    }

    if (pathValid && current !== undefined) {
      return current as T;
    }

    throw new Error('Invalid path');
  }, defaultValue);
}
