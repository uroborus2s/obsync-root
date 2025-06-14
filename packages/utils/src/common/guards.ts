/**
 * 通用类型守卫工具函数，提供类型检查相关功能
 *
 * 此模块包含一系列用于类型检查的工具函数，可用于验证数据类型，
 * 支持检查基本类型、对象类型、复合类型等，帮助开发者实现可靠的类型判断。
 *
 * @remarks
 * 模块: 类型检查
 * 版本: 1.0.0
 *
 * @packageDocumentation
 */

import { isObject as dataIsObject } from '../data/object.js';

/**
 * 检查值是否为null
 *
 * @param value - 需要检查的值
 * @returns 如果值为null则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isNull(null);   // true
 * isNull({});     // false
 * ```
 * @public
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * 检查值是否为undefined
 *
 * @param value - 需要检查的值
 * @returns 如果值为undefined则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isUndefined(undefined);   // true
 * isUndefined({});          // false
 * ```
 * @public
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * 检查值是否为null或undefined
 *
 * @param value - 需要检查的值
 * @returns 如果值为null或undefined则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isNil(null);      // true
 * isNil(undefined); // true
 * isNil({});        // false
 * ```
 * @public
 */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查值是否为数组
 *
 * @param value - 需要检查的值
 * @returns 如果值是数组则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isArray([]);       // true
 * isArray([1, 2, 3]); // true
 * isArray({});       // false
 * ```
 * @public
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * 检查值是否为Date对象
 *
 * @param value - 需要检查的值
 * @returns 如果值是Date对象则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isDate(new Date());    // true
 * isDate('2021-01-01');  // false
 * ```
 * @public
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

/**
 * 检查值是否为正则表达式
 *
 * @param value - 需要检查的值
 * @returns 如果值是正则表达式则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isRegExp(/\w+/);       // true
 * isRegExp(new RegExp('\\w+')); // true
 * isRegExp('\\w+');      // false
 * ```
 * @public
 */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

/**
 * 检查值是否为字符串
 *
 * @param value - 需要检查的值
 * @returns 如果值是字符串则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isString('hello');     // true
 * isString(123);         // false
 * ```
 * @public
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为数字
 *
 * @param value - 需要检查的值
 * @returns 如果值是数字则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isNumber(123);         // true
 * isNumber(NaN);         // true
 * isNumber('123');       // false
 * ```
 * @public
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * 检查值是否为有限数字
 *
 * @param value - 需要检查的值
 * @returns 如果值是有限数字则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isFiniteNumber(123);   // true
 * isFiniteNumber(NaN);   // false
 * isFiniteNumber(Infinity); // false
 * isFiniteNumber('123'); // false
 * ```
 * @public
 */
export function isFiniteNumber(value: unknown): value is number {
  return isNumber(value) && isFinite(value);
}

/**
 * 检查值是否为布尔值
 *
 * @param value - 需要检查的值
 * @returns 如果值是布尔值则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isBoolean(true);       // true
 * isBoolean(false);      // true
 * isBoolean(1);          // false
 * ```
 * @public
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 检查值是否为函数
 *
 * @param value - 需要检查的值
 * @returns 如果值是函数则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isFunction(() => {});  // true
 * isFunction(function() {}); // true
 * isFunction({}); // false
 * ```
 * @public
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * 检查值是否为对象
 *
 * @example
 * ```typescript
 * isObject({});            // true
 * isObject(new Date());    // true
 * isObject(null);          // false
 * isObject([]);            // false
 * ```
 *
 * @param value - 需要检查的值
 * @returns 如果值是对象且不是null或数组则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @public
 */
export const isObject = dataIsObject;

/**
 * 检查值是否为空对象
 *
 * @example
 * ```typescript
 * isEmptyObject({});          // true
 * isEmptyObject({ a: 1 });    // false
 * isEmptyObject([]);          // false
 * ```
 *
 * @param value - 需要检查的值
 * @returns 如果值是空对象则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @public
 */
export function isEmptyObject(value: unknown): boolean {
  return isObject(value) && Object.keys(value).length === 0;
}

/**
 * 检查值是否为普通对象
 *
 * @param value - 需要检查的值
 * @returns 如果值是普通对象则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isPlainObject({});         // true
 * isPlainObject(new Object()); // true
 * isPlainObject(new Date()); // false
 * isPlainObject([]);         // false
 * ```
 * @public
 */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (!isObject(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

/**
 * 检查值是否为Error对象
 *
 * @param value - 需要检查的值
 * @returns 如果值是Error对象则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isError(new Error('error')); // true
 * isError(new TypeError('type error')); // true
 * isError({ message: 'error' }); // false
 * ```
 * @public
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * 检查值是否为Promise
 *
 * @param value - 需要检查的值
 * @returns 如果值是Promise则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @example
 * ```typescript
 * isPromise(Promise.resolve());      // true
 * isPromise({ then: () => {} });     // true
 * isPromise({});                     // false
 * ```
 * @public
 */
export function isPromise(value: unknown): value is Promise<unknown> {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as Promise<unknown>).then === 'function'
  );
}

/**
 * 检查值是否为指定类的实例
 *
 * @example
 * ```typescript
 * class Test {}
 * const test = new Test();
 * isInstanceOf(test, Test);     // true
 * isInstanceOf({}, Object);     // true
 * isInstanceOf([], Array);      // true
 * ```
 *
 * @param value - 需要检查的值
 * @param constructor - 构造函数
 * @returns 如果值是指定类的实例则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @public
 */
export function isInstanceOf<T>(
  value: unknown,
  constructor: new (...args: any[]) => T
): value is T {
  return value instanceof constructor;
}

/**
 * 获取值的原始类型
 *
 * 返回值的原始类型名称（小写），如'string', 'number', 'boolean'等。
 *
 * @example
 * ```typescript
 * getType(null);         // 'null'
 * getType(undefined);    // 'undefined'
 * getType('hello');      // 'string'
 * getType(123);          // 'number'
 * getType([]);           // 'array'
 * getType({});           // 'object'
 * getType(new Date());   // 'date'
 * ```
 *
 * @param value - 要检查的值
 * @returns 值的类型名称（小写）
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @public
 */
export function getType(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (isArray(value)) {
    return 'array';
  }

  if (isDate(value)) {
    return 'date';
  }

  if (isRegExp(value)) {
    return 'regexp';
  }

  return typeof value;
}

/**
 * 类型检查函数，返回一个类型守卫函数
 *
 * @example
 * ```typescript
 * const isStringArray = typeGuard<string[]>('array');
 * const values = ['a', 'b', 'c'];
 * if (isStringArray(values)) {
 *   // values 在这里被视为 string[]
 *   values.join(', ');
 * }
 * ```
 *
 * @param typeName - 类型名称
 * @returns 用于类型守卫的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @public
 */
export function typeGuard<T>(typeName: string): (value: unknown) => value is T {
  return function (value: unknown): value is T {
    return getType(value) === typeName.toLowerCase();
  };
}
