/**
 * @remarks
 * 模块:
 *
 * 数据合并工具函数，提供对象合并、克隆等操作
 *
 * 该模块提供了一系列对象合并和克隆相关的工具函数，用于处理对象的合并、浅拷贝、深度克隆等操作，
 * 支持处理嵌套对象、数组、日期和正则表达式等复杂数据结构。
 *
 * @remarks
 * 版本: 1.0.0
 *
 * @example
 * ```typescript
 * import { assign, deepClone, deepMerge } from '@stratix/utils/data/merge';
 *
 * // 对象浅合并
 * assign({a: 1}, {b: 2}, {c: 3}); // {a: 1, b: 2, c: 3}
 *
 * // 深度克隆对象
 * const original = {a: {b: {c: 1}}};
 * const cloned = deepClone(original);
 * // cloned是original的深拷贝，修改cloned不会影响original
 *
 * // 深度合并对象
 * deepMerge({a: {b: 1, c: 2}}, {a: {b: 3, d: 4}}); // {a: {b: 3, c: 2, d: 4}}
 * ```
 *
 * @packageDocumentation
 */

import { isObject } from './object.js';

/**
 * 合并两个数组并去重
 *
 * 将两个数组合并，并移除重复的元素。对于对象类型的元素，
 * 使用深度比较来判断是否相等。
 *
 * @param target - 目标数组
 * @param source - 源数组
 * @returns 合并后的去重数组
 */
function mergeArraysWithDeduplication<T>(target: T[], source: T[]): T[] {
  const result = [...target];

  for (const sourceItem of source) {
    // 检查是否已存在相同的元素
    const isDuplicate = result.some((resultItem) => {
      // 对于基本类型，直接比较
      if (typeof sourceItem !== 'object' || sourceItem === null) {
        return resultItem === sourceItem;
      }

      // 对于对象类型，进行深度比较
      return deepEqual(resultItem, sourceItem);
    });

    // 如果不是重复元素，则添加到结果中
    if (!isDuplicate) {
      result.push(sourceItem);
    }
  }

  return result;
}

/**
 * 深度比较两个值是否相等
 *
 * 递归比较两个值的所有属性，支持对象、数组、基本类型等。
 *
 * @param a - 第一个值
 * @param b - 第二个值
 * @returns 如果两个值深度相等则返回 true，否则返回 false
 */
function deepEqual(a: any, b: any): boolean {
  // 严格相等检查
  if (a === b) {
    return true;
  }

  // null 和 undefined 检查
  if (a == null || b == null) {
    return a === b;
  }

  // 类型检查
  if (typeof a !== typeof b) {
    return false;
  }

  // 日期比较
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // 正则表达式比较
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // 数组比较
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }

    return true;
  }

  // 对象比较
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  // 其他情况
  return false;
}

/**
 * 将一个或多个源对象的可枚举属性分配到目标对象
 *
 * 将一个或多个源对象中的所有可枚举属性复制到目标对象。它执行的是浅拷贝，不会深度合并对象。
 * 如果多个源对象具有相同的属性，则后面对象的属性会覆盖前面对象的属性。
 *
 * @param target - 目标对象
 * @param sources - 源对象列表
 * @returns 合并后的目标对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象合并
 *
 * @example
 * ```typescript
 * // 合并多个对象
 * const target = { a: 1 };
 * assign(target, { b: 2 }, { c: 3 });
 * // 输出: { a: 1, b: 2, c: 3 }
 *
 * // 属性覆盖
 * assign({ a: 1, b: 2 }, { b: 3, c: 4 });
 * // 输出: { a: 1, b: 3, c: 4 }
 * ```
 */
export function assign<
  T extends Record<string, any>,
  S extends Record<string, any>[]
>(target: T, ...sources: S): T & S[number] {
  return Object.assign(target, ...sources);
}

/**
 * 将源对象中的属性分配到目标对象，但仅当目标对象中没有对应属性时
 *
 * 类似于`assign`函数，但只会添加目标对象中不存在的属性，不会覆盖已有属性。
 *
 * @param target - 目标对象
 * @param sources - 源对象列表
 * @returns 合并后的目标对象
 * @throws `TypeError` 如果target是null或undefined
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象合并
 *
 * @example
 * ```typescript
 * // 不覆盖已存在的属性
 * const target = { a: 1, b: 2 };
 * defaults(target, { b: 3, c: 4 });
 * // 输出: { a: 1, b: 2, c: 4 }
 *
 * // 合并多个对象
 * defaults({}, { a: 1 }, { b: 2 }, { a: 3 });
 * // 输出: { a: 1, b: 2 }
 * ```
 */
export function defaults<
  T extends Record<string, any>,
  S extends Record<string, any>[]
>(target: T, ...sources: S): T & Partial<S[number]> {
  if (target == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }

  const result = Object(target);

  for (const source of sources) {
    if (source != null) {
      for (const key in source) {
        if (
          Object.prototype.hasOwnProperty.call(source, key) &&
          result[key] === undefined
        ) {
          result[key] = source[key];
        }
      }
    }
  }

  return result as T & Partial<S[number]>;
}

/**
 * 深度克隆一个值
 *
 * 创建值的深拷贝，包括嵌套对象和数组。支持基本类型、日期、正则表达式、对象和数组，
 * 但不支持函数、DOM节点、Map、Set和其他复杂类型的深拷贝。
 *
 * @param value - 要克隆的值
 * @returns 克隆后的值
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象克隆
 *
 * @example
 * ```typescript
 * // 克隆基本类型
 * deepClone(42); // 42
 * deepClone('hello'); // 'hello'
 *
 * // 克隆数组
 * deepClone([1, [2, 3]]); // [1, [2, 3]]（深拷贝）
 *
 * // 克隆对象
 * const original = { a: 1, b: { c: 2 } };
 * const clone = deepClone(original);
 * clone.b.c = 3;
 * console.log(original.b.c); // 2（未受影响）
 *
 * // 克隆日期
 * const date = new Date();
 * const clonedDate = deepClone(date);
 * // clonedDate是date的深拷贝
 * ```
 */
export function deepClone<T>(value: T): T {
  // 处理基本类型和函数
  if (value == null || typeof value !== 'object') {
    return value;
  }

  // 处理日期
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  // 处理正则表达式
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  // 处理数组
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }

  // 处理对象
  if (isObject(value)) {
    const valueAsRecord = value as Record<string, any>;
    const result: Record<string, any> = {};

    for (const key in valueAsRecord) {
      if (Object.prototype.hasOwnProperty.call(valueAsRecord, key)) {
        result[key] = deepClone(valueAsRecord[key]);
      }
    }

    return result as unknown as T;
  }

  // 其他类型直接返回
  return value;
}

/**
 * 深度合并对象
 *
 * 将一个或多个源对象的属性深度合并到目标对象中。
 * 不同于assign，该函数会递归合并嵌套对象，并智能合并数组（去重）。
 *
 * @param target - 目标对象
 * @param sources - 源对象列表
 * @returns 合并后的目标对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象合并
 *
 * @example
 * ```typescript
 * // 深度合并对象
 * const target = { a: { b: 1, c: 2 } };
 * deepMerge(target, { a: { b: 3, d: 4 } });
 * // 输出: { a: { b: 3, c: 2, d: 4 } }
 *
 * // 合并数组（自动去重）
 * deepMerge(
 *   { a: [1, 2], b: { c: 3 } },
 *   { a: [2, 3], b: { d: 5 } }
 * );
 * // 输出: { a: [1, 2, 3], b: { c: 3, d: 5 } }
 *
 * // 合并对象数组（深度去重）
 * deepMerge(
 *   { items: [{ id: 1, name: 'A' }] },
 *   { items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] }
 * );
 * // 输出: { items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] }
 * ```
 */
export function deepMerge<
  T extends Record<string, any>,
  S extends Record<string, any>[]
>(target: T, ...sources: S): T & S[number] {
  if (!isObject(target)) {
    throw new TypeError('Target must be an object');
  }

  // 创建目标对象的副本以避免修改原始对象
  const result: Record<string, any> = deepClone(target);

  for (const source of sources) {
    if (!isObject(source)) {
      continue;
    }

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const resultValue = result[key];
        const sourceValue = source[key];

        // 递归合并对象
        if (isObject(resultValue) && isObject(sourceValue)) {
          result[key] = deepMerge({ ...resultValue }, sourceValue);
          continue;
        }

        // 合并数组（去重）
        if (Array.isArray(resultValue) && Array.isArray(sourceValue)) {
          result[key] = mergeArraysWithDeduplication(resultValue, sourceValue);
          continue;
        }

        // 其他情况直接覆盖
        result[key] = deepClone(sourceValue);
      }
    }
  }

  return result as T & S[number];
}

/**
 * 不可变深度合并对象
 *
 * 将一个或多个源对象的属性深度合并，返回新对象而不修改原对象。
 * 是deepMerge的不可变版本，确保原始对象保持不变。
 *
 * @param target - 目标对象
 * @param sources - 源对象列表
 * @returns 合并后的新对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象合并
 *
 * @example
 * ```typescript
 * // 不可变深度合并
 * const original = { a: { b: 1, c: 2 } };
 * const result = immutableDeepMerge(original, { a: { b: 3, d: 4 } });
 * // 输出: { a: { b: 3, c: 2, d: 4 } }
 * // original保持不变: { a: { b: 1, c: 2 } }
 * ```
 */
export function immutableDeepMerge<
  T extends Record<string, any>,
  S extends Record<string, any>[]
>(target: T, ...sources: S): T & S[number] {
  if (!isObject(target)) {
    throw new TypeError('Target must be an object');
  }

  // 深度克隆目标对象，确保不可变性
  const result = deepClone(target);

  return deepMerge(result, ...sources);
}
