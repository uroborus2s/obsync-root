/**
 * 记忆化函数实现
 */

/**
 * 默认的键解析器，将所有参数转换为缓存键
 * @param args 函数参数
 * @returns 缓存键
 */
function defaultKeyResolver(...args: any[]): string {
  return args.length === 1 && typeof args[0] === 'string'
    ? args[0]
    : JSON.stringify(args);
}

/**
 * 创建带缓存的函数
 *
 * @description 记忆化函数会缓存之前计算的结果，如果使用相同的参数再次调用，直接返回缓存的结果。
 *
 * @param func 需要记忆化的函数
 * @param resolver 键解析器，用于从参数创建缓存键，默认使用JSON.stringify
 * @returns 记忆化后的函数，包含cache属性提供对缓存的访问
 */
export function memoize<F extends (...args: any[]) => any>(
  func: F,
  resolver?: (...args: any[]) => string
): F & { cache: Map<string, any> } {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }

  const keyResolver = resolver || defaultKeyResolver;
  const memoized = function (this: any, ...args: any[]): any {
    const key = keyResolver.apply(this, args);

    if (memoized.cache.has(key)) {
      return memoized.cache.get(key);
    }

    const result = func.apply(this, args);
    memoized.cache.set(key, result);
    return result;
  };

  // 创建缓存对象
  memoized.cache = new Map<string, any>();

  return memoized as unknown as F & { cache: Map<string, any> };
}
