/**
 * @remarks
 * 模块:
 *
 * 数据比较工具函数，提供对象和数组的比较操作
 *
 * 该模块提供了一系列用于数据比较的工具函数，包括检查空值、深度比较对象等功能，
 * 可用于各种数据比较场景，支持基本类型、对象、数组、日期和正则表达式等数据类型。
 *
 * @remarks
 * 版本: 1.0.0
 *
 * @example
 * ```typescript
 * import { isEmpty, isEqual } from '@stratix/utils/data/compare';
 *
 * // 检查空值
 * isEmpty([]); // true
 * isEmpty({ name: 'John' }); // false
 *
 * // 深度比较对象
 * isEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }); // true
 * isEqual({ a: 1 }, { a: 2 }); // false
 * ```
 *
 * @packageDocumentation
 */

import { isObject } from './object.js';

/**
 * 检查值是否为空
 *
 * 判断给定值是否为空。对于不同类型的值，判断标准如下：
 * - null 或 undefined：返回 true
 * - 字符串或数组：长度为 0 时返回 true
 * - 对象：没有自身可枚举属性时返回 true
 * - 其他类型：返回 false
 *
 * @param value - 要检查的值
 * @returns 如果值为空则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 值比较
 *
 * @example
 * ```typescript
 * // 检查各种类型
 * isEmpty(null); // true
 * isEmpty(undefined); // true
 * isEmpty(''); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty('hello'); // false
 * isEmpty([1, 2]); // false
 * isEmpty({ a: 1 }); // false
 * isEmpty(0); // false
 * isEmpty(false); // false
 * ```
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  if (isObject(value)) {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * 检查值是否不为空
 *
 * `isEmpty` 函数的反向操作，判断给定值是否不为空。
 *
 * @param value - 要检查的值
 * @returns 如果值不为空则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 值比较
 *
 * @example
 * ```typescript
 * // 检查各种类型
 * isNotEmpty(null); // false
 * isNotEmpty(''); // false
 * isNotEmpty('hello'); // true
 * isNotEmpty([1, 2]); // true
 * isNotEmpty({ a: 1 }); // true
 * ```
 */
export function isNotEmpty(value: unknown): boolean {
  return !isEmpty(value);
}

/**
 * 深度比较两个值是否相等
 *
 * 执行两个值的深度比较，支持比较基本类型、对象、数组、日期和正则表达式等。
 * 对于对象和数组，会递归比较其每个属性或元素。
 *
 * @param value - 第一个值
 * @param other - 第二个值
 * @returns 如果两个值相等则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 值比较
 *
 * @example
 * ```typescript
 * // 比较基本类型
 * isEqual(1, 1); // true
 * isEqual('a', 'a'); // true
 * isEqual(null, undefined); // false
 *
 * // 比较数组
 * isEqual([1, 2, 3], [1, 2, 3]); // true
 * isEqual([1, 2, 3], [1, 2, 4]); // false
 *
 * // 比较对象
 * isEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
 * isEqual({ a: 1, b: 2 }, { b: 2, a: 1 }); // true (顺序不重要)
 * isEqual({ a: 1 }, { a: 1, b: 2 }); // false (属性数量不同)
 *
 * // 比较嵌套结构
 * isEqual(
 *   { a: 1, b: { c: 3, d: [4, 5] } },
 *   { a: 1, b: { c: 3, d: [4, 5] } }
 * ); // true
 *
 * // 比较日期
 * isEqual(new Date('2021-01-01'), new Date('2021-01-01')); // true
 * ```
 */
export function isEqual(value: unknown, other: unknown): boolean {
  // 处理基本类型和引用相等
  if (value === other) {
    return true;
  }

  // 处理null和undefined
  if (value == null || other == null) {
    return value === other;
  }

  // 处理不同类型
  const valueType = typeof value;
  const otherType = typeof other;
  if (valueType !== otherType) {
    return false;
  }

  // 处理日期对象
  if (value instanceof Date && other instanceof Date) {
    return value.getTime() === other.getTime();
  }

  // 处理正则表达式
  if (value instanceof RegExp && other instanceof RegExp) {
    return value.toString() === other.toString();
  }

  // 处理数组
  if (Array.isArray(value) && Array.isArray(other)) {
    if (value.length !== other.length) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      if (!isEqual(value[i], other[i])) {
        return false;
      }
    }

    return true;
  }

  // 处理对象
  if (isObject(value) && isObject(other)) {
    const valueKeys = Object.keys(value);
    const otherKeys = Object.keys(other);

    if (valueKeys.length !== otherKeys.length) {
      return false;
    }

    for (const key of valueKeys) {
      if (!Object.prototype.hasOwnProperty.call(other, key)) {
        return false;
      }

      if (!isEqual(value[key], other[key])) {
        return false;
      }
    }

    return true;
  }

  // 其他情况视为不相等
  return false;
}
