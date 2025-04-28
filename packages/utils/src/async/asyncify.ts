/**
 * 同步函数转异步函数相关函数
 */

/**
 * 将同步函数转换为异步函数（返回Promise）
 * @param fn 同步函数
 * @returns 返回Promise的异步函数
 */
export function asyncify<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  // 参数验证
  if (typeof fn !== 'function') {
    throw new TypeError('Expected fn to be a function');
  }

  // 返回包装函数
  return async function (...args: Parameters<T>): Promise<ReturnType<T>> {
    try {
      // 在异步上下文中调用同步函数
      return fn(...args);
    } catch (error) {
      // 将错误转换为Promise拒绝
      throw error;
    }
  };
}

/**
 * 将同步函数转换为异步函数，并应用到对象的所有方法
 * @param obj 包含同步方法的对象
 * @returns 包含异步方法的新对象
 */
export function asyncifyAll<T extends Record<string, any>>(
  obj: T
): {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : T[K];
} {
  // 参数验证
  if (typeof obj !== 'object' || obj === null) {
    throw new TypeError('Expected obj to be an object');
  }

  // 创建新对象
  const result: Record<string, any> = { ...obj };

  // 遍历所有属性
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // 如果是函数，将其转换为异步函数
      if (typeof value === 'function') {
        result[key] = asyncify(value);
      }
    }
  }

  return result as any;
}
