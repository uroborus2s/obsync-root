/**
 * 对象合并和克隆相关函数
 */

/**
 * 判断值是否为普通对象（不包括数组、函数等）
 */
function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 创建值的深拷贝
 * @param value 要深拷贝的值
 * @returns 深拷贝后的值
 */
export function deepClone<T>(value: T): T {
  // 检查环境是否支持structuredClone
  if (typeof structuredClone === 'function') {
    try {
      // 尝试使用原生方法
      return structuredClone(value);
    } catch (err) {
      // 处理不支持的类型（如函数），回退到自定义实现
      return customDeepClone(value);
    }
  }
  // 环境不支持原生方法，使用自定义实现
  return customDeepClone(value);
}

/**
 * 自定义深拷贝实现
 * @private
 */
function customDeepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => customDeepClone(item)) as unknown as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, any> = {};

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = customDeepClone((value as Record<string, any>)[key]);
      }
    }

    return result as T;
  }

  // 处理Date、正则表达式等特殊对象
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  // 对于Map和Set等集合类型的处理
  if (value instanceof Map) {
    const result = new Map();
    value.forEach((val, key) => {
      result.set(customDeepClone(key), customDeepClone(val));
    });
    return result as unknown as T;
  }

  if (value instanceof Set) {
    const result = new Set();
    value.forEach((val) => {
      result.add(customDeepClone(val));
    });
    return result as unknown as T;
  }

  // 对于其他类型的对象，直接返回原值
  return value;
}

/**
 * 深度合并多个对象
 * @param objects 要合并的源对象
 * @returns 合并后的新对象
 */
export function deepMerge<T extends object>(
  ...objects: Array<Partial<T> | null | undefined>
): T {
  if (objects.length === 0) {
    return {} as T;
  }

  if (objects.length === 1) {
    return { ...(objects[0] || {}) } as T;
  }

  const result = {} as Record<string, any>;

  for (const object of objects) {
    if (object == null) {
      continue;
    }

    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        const value = object[key];

        if (isPlainObject(value) && isPlainObject(result[key])) {
          // 如果两个值都是普通对象，递归合并
          result[key] = deepMerge(result[key], value as object);
        } else {
          // 否则直接赋值
          result[key] = value;
        }
      }
    }
  }

  return result as T;
}
