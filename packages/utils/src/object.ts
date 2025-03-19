/**
 * 对象工具函数
 */

/**
 * 检查值是否为空
 * @param value 要检查的值
 * @returns 是否为空
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * 检查值是否为非空
 * @param value 要检查的值
 * @returns 是否为非空
 */
export function isNotEmpty(value: any): boolean {
  return !isEmpty(value);
}

/**
 * 深度合并对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Record<string, any>[]
): T {
  if (!sources.length) return target;

  const source = sources.shift();

  if (source === undefined) return target;

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * 检查值是否为对象
 * @param item 要检查的值
 * @returns 是否为对象
 */
export function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 深度克隆对象
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as any;
  }

  const cloned: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone((obj as Record<string, any>)[key]);
    }
  }

  return cloned as T;
}

/**
 * 选择对象的部分属性
 * @param obj 源对象
 * @param keys 要选择的属性
 * @returns 包含选择属性的新对象
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * 排除对象的部分属性
 * @param obj 源对象
 * @param keys 要排除的属性
 * @returns 不包含排除属性的新对象
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result;
}

/**
 * 将对象的键转换为驼峰命名
 * @param obj 源对象
 * @returns 键为驼峰命名的新对象
 */
export function camelizeKeys<T extends Record<string, any>>(
  obj: T
): Record<string, any> {
  if (Array.isArray(obj)) {
    return obj.map((v) => camelizeKeys(v));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        result[camelKey] = camelizeKeys(obj[key]);
      }
    }

    return result;
  }

  return obj;
}

/**
 * 将对象的键转换为蛇形命名
 * @param obj 源对象
 * @returns 键为蛇形命名的新对象
 */
export function snakeizeKeys<T extends Record<string, any>>(
  obj: T
): Record<string, any> {
  if (Array.isArray(obj)) {
    return obj.map((v) => snakeizeKeys(v));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        result[snakeKey] = snakeizeKeys(obj[key]);
      }
    }

    return result;
  }

  return obj;
}
