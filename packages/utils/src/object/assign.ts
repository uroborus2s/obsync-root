/**
 * 对象合并相关函数
 */

import { isObject } from './property.js';

/**
 * 将所有可枚举属性的值从一个或多个源对象复制到目标对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 目标对象
 */
export function assign<T extends object>(
  target: T,
  ...sources: Array<Record<string, any>>
): T {
  if (target === null || target === undefined) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  return Object.assign(target, ...sources);
}

/**
 * 深度合并对象，将嵌套对象的所有可枚举属性从一个或多个源对象复制到目标对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 目标对象
 */
export function assignDeep<T extends object>(
  target: T,
  ...sources: Array<Record<string, any>>
): T {
  if (target === null || target === undefined) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  if (sources.length === 0) {
    return target;
  }

  // 获取第一个源对象
  const source = sources.shift();

  if (source === undefined) {
    return target;
  }

  if (isObject(source)) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        // 如果属性是对象，则递归合并
        if (isObject(source[key])) {
          if (!isObject((target as Record<string, any>)[key])) {
            (target as Record<string, any>)[key] = {};
          }

          assignDeep((target as Record<string, any>)[key], source[key]);
        } else {
          // 普通属性直接赋值
          (target as Record<string, any>)[key] = source[key];
        }
      }
    }
  }

  // 递归处理剩余的源对象
  return assignDeep(target, ...sources);
}

/**
 * 为对象中未定义的属性分配默认值
 * @param object 目标对象
 * @param sources 默认值对象
 * @returns 目标对象
 */
export function defaults<T extends object>(
  object: T,
  ...sources: Array<Record<string, any>>
): T {
  if (object === null || object === undefined) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  if (sources.length === 0) {
    return object;
  }

  // 处理每个默认值对象
  for (const source of sources) {
    if (source === null || source === undefined) {
      continue;
    }

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        // 只有当目标对象的属性为undefined时才设置默认值
        if ((object as Record<string, any>)[key] === undefined) {
          (object as Record<string, any>)[key] = source[key];
        }
      }
    }
  }

  return object;
}
