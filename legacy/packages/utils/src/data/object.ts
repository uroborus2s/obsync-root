/**
 * 对象操作工具函数，提供对象属性访问、转换等操作
 *
 * 该模块提供了丰富的对象处理函数，包括属性读取、设置、检查、映射和转换等操作，
 * 帮助开发者以简洁高效的方式处理和转换对象数据。
 *
 * @remarks
 * 模块: 对象操作
 * 版本: 1.0.0
 * 分类: 工具函数
 *
 * @example
 * ```typescript
 * import { get, set, has } from '@stratix/utils/data/object';
 *
 * const obj = { user: { name: 'Alice', profile: { age: 30 } } };
 *
 * // 安全地获取嵌套属性
 * get(obj, 'user.profile.age'); // 30
 * get(obj, 'user.address', 'Unknown'); // 'Unknown'
 *
 * // 检查属性是否存在
 * has(obj, 'user.name'); // true
 * has(obj, 'user.address'); // false
 *
 * // 设置嵌套属性值
 * set(obj, 'user.profile.address', '123 Main St');
 * // obj 现在包含 user.profile.address 属性
 * ```
 *
 * @packageDocumentation
 */

/**
 * 检查值是否为对象
 *
 * 检查给定值是否为普通对象（排除数组和null）。
 *
 * @example
 * ```typescript
 * // 判断不同类型
 * isObject({}); // true
 * isObject({ a: 1 }); // true
 * isObject([]); // false
 * isObject(null); // false
 * isObject(new Date()); // true
 * ```
 *
 * @param value - 要检查的值
 * @returns 如果值是对象则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型检查
 *
 * @public
 */
export function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 获取对象的指定路径的值
 *
 * 安全地获取对象中嵌套属性的值，支持点符号路径和数组路径。
 * 如果路径不存在，则返回默认值。
 *
 * @example
 * ```typescript
 * // 使用点符号路径
 * const obj = { a: { b: { c: 42 } } };
 * get(obj, 'a.b.c'); // 42
 * get(obj, 'a.b.x', 'default'); // 'default'
 *
 * // 使用数组路径
 * get(obj, ['a', 'b', 'c']); // 42
 *
 * // 访问数组元素
 * const arr = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
 * get(arr, 'users.1.name'); // 'Bob'
 * ```
 *
 * @param object - 要获取属性的对象
 * @param path - 属性路径，可以是点分隔的字符串或路径数组
 * @param defaultValue - 如果路径不存在，返回的默认值
 * @returns 路径对应的值，如果路径不存在则返回默认值
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象访问
 *
 * @public
 */
export function get<T = any>(
  object: any,
  path: string | string[],
  defaultValue?: T
): T {
  if (object == null) {
    return defaultValue as T;
  }

  const keys = Array.isArray(path) ? path : path.split('.');
  let result: any = object;

  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue as T;
    }
    result = result[key];
  }

  return (result === undefined ? defaultValue : result) as T;
}

/**
 * 检查对象是否有指定路径的属性
 *
 * 检查对象中是否存在指定的嵌套属性路径。
 *
 * @example
 * ```typescript
 * // 检查属性是否存在
 * const obj = { a: { b: { c: 42 } } };
 * has(obj, 'a.b.c'); // true
 * has(obj, 'a.b.d'); // false
 * has(obj, ['a', 'b', 'c']); // true
 * ```
 *
 * @param object - 要检查的对象
 * @param path - 属性路径，可以是点分隔的字符串或路径数组
 * @returns 如果路径存在则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象访问
 *
 * @public
 */
export function has(object: any, path: string | string[]): boolean {
  if (object == null) {
    return false;
  }

  const keys = Array.isArray(path) ? path : path.split('.');
  let current = object;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return false;
    }
    if (!(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

/**
 * 设置对象指定路径的值
 *
 * 安全地设置对象中嵌套属性的值，自动创建沿途不存在的属性对象。
 *
 * @example
 * ```typescript
 * // 设置现有属性
 * const obj = { a: { b: { c: 42 } } };
 * set(obj, 'a.b.c', 100);
 * // obj: { a: { b: { c: 100 } } }
 *
 * // 创建不存在的路径
 * set(obj, 'x.y.z', 'value');
 * // obj: { a: { b: { c: 100 } }, x: { y: { z: 'value' } } }
 *
 * // 使用数组路径
 * set(obj, ['a', 'b', 'd'], 'new value');
 * // obj: { a: { b: { c: 100, d: 'new value' } }, x: { y: { z: 'value' } } }
 * ```
 *
 * @param object - 要设置属性的对象
 * @param path - 属性路径，可以是点分隔的字符串或路径数组
 * @param value - 要设置的值
 * @returns 修改后的对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象修改
 *
 * @public
 */
export function set<T extends Record<string, any>>(
  object: T,
  path: string | string[],
  value: any
): T {
  if (object == null) {
    return object;
  }

  const keys = Array.isArray(path) ? path : path.split('.');
  const lastKey = keys.pop();

  if (lastKey === undefined) {
    return object;
  }

  let current: Record<string, any> = object;
  for (const key of keys) {
    if (current[key] == null) {
      current[key] = {};
    } else if (typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, any>;
  }

  current[lastKey] = value;
  return object;
}

/**
 * 获取对象的所有键
 *
 * 返回对象自身可枚举属性的键名数组。
 *
 * @example
 * ```typescript
 * // 获取对象的所有键
 * const obj = { a: 1, b: 2, c: 3 };
 * keys(obj); // ['a', 'b', 'c']
 * ```
 *
 * @param object - 要获取键的对象
 * @returns 包含对象所有键的数组
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象检查
 *
 * @public
 */
export function keys<T extends object>(object: T): Array<keyof T> {
  return Object.keys(object) as Array<keyof T>;
}

/**
 * 获取对象的所有值
 *
 * 返回对象自身可枚举属性的值数组。
 *
 * @example
 * ```typescript
 * // 获取对象的所有值
 * const obj = { a: 1, b: 2, c: 3 };
 * values(obj); // [1, 2, 3]
 * ```
 *
 * @param object - 要获取值的对象
 * @returns 包含对象所有值的数组
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象检查
 *
 * @public
 */
export function values<T extends object>(object: T): Array<T[keyof T]> {
  return Object.values(object);
}

/**
 * 获取对象的所有键值对
 *
 * 返回对象自身可枚举属性的键值对数组。
 *
 * @example
 * ```typescript
 * // 获取对象的所有键值对
 * const obj = { a: 1, b: 2, c: 3 };
 * entries(obj); // [['a', 1], ['b', 2], ['c', 3]]
 * ```
 *
 * @param object - 要获取键值对的对象
 * @returns 包含键值对的数组
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象转换
 *
 * @public
 */
export function entries<T extends object>(
  object: T
): Array<[keyof T, T[keyof T]]> {
  return Object.entries(object) as Array<[keyof T, T[keyof T]]>;
}

/**
 * 将键值对数组转换为对象
 *
 * 从键值对数组创建一个对象。
 *
 * @example
 * ```typescript
 * // 将键值对数组转换为对象
 * const pairs = [['a', 1], ['b', 2], ['c', 3]];
 * fromEntries(pairs); // { a: 1, b: 2, c: 3 }
 * ```
 *
 * @param entries - 键值对数组
 * @returns 由键值对构建的对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象转换
 *
 * @public
 */
export function fromEntries<K extends string | number | symbol, V>(
  entries: Array<[K, V]>
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

/**
 * 对对象的每个键应用一个转换函数，生成一个新对象
 *
 * 创建一个新对象，其中的键是通过对原对象的键应用迭代函数生成的。
 *
 * @example
 * ```typescript
 * // 将对象的键转为大写
 * const obj = { a: 1, b: 2, c: 3 };
 * mapKeys(obj, key => key.toUpperCase()); // { A: 1, B: 2, C: 3 }
 * ```
 *
 * @param object - 要转换的对象
 * @param iteratee - 转换函数，接收当前键和值，返回新的键
 * @returns 转换后的新对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象转换
 *
 * @public
 */
export function mapKeys<T extends object, K extends string | number | symbol>(
  object: T,
  iteratee: (key: string, value: T[keyof T], object: T) => K
): Record<K, T[keyof T]> {
  const result: Record<K, T[keyof T]> = {} as Record<K, T[keyof T]>;

  for (const [key, value] of Object.entries(object)) {
    const newKey = iteratee(key, value, object);
    result[newKey] = value;
  }

  return result;
}

/**
 * 对对象的每个值应用一个转换函数，生成一个新对象
 *
 * 创建一个新对象，与原对象有相同的键，但值是通过对原对象的每个值应用迭代函数生成的。
 *
 * @example
 * ```typescript
 * // 将对象的每个值翻倍
 * const obj = { a: 1, b: 2, c: 3 };
 * mapValues(obj, value => value * 2); // { a: 2, b: 4, c: 6 }
 * ```
 *
 * @param object - 要转换的对象
 * @param iteratee - 转换函数，接收当前值和键，返回新的值
 * @returns 转换后的新对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象转换
 *
 * @public
 */
export function mapValues<T extends object, R>(
  object: T,
  iteratee: (value: T[keyof T], key: string, object: T) => R
): Record<keyof T, R> {
  const result: Record<keyof T, R> = {} as Record<keyof T, R>;

  for (const [key, value] of Object.entries(object)) {
    result[key as keyof T] = iteratee(value, key, object);
  }

  return result;
}

/**
 * 通过迭代函数转换对象
 *
 * 对对象的每个键值对执行累积操作，将结果收集到累积器中。
 *
 * @example
 * ```typescript
 * // 创建键值反转的对象
 * const obj = { a: 1, b: 2, c: 3 };
 * transform(obj, (result, value, key) => {
 *   result[value] = key;
 * }, {}); // { '1': 'a', '2': 'b', '3': 'c' }
 *
 * // 将偶数值筛选到数组中
 * transform(obj, (result, value) => {
 *   if (value % 2 === 0) {
 *     result.push(value);
 *   }
 * }, []); // [2]
 * ```
 *
 * @param object - 要转换的对象
 * @param iteratee - 转换函数，接收累积结果、当前值、当前键
 * @param accumulator - 累积结果初始值
 * @returns 转换后的结果
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象转换
 *
 * @public
 */
export function transform<T, R>(
  object: Record<string, any>,
  iteratee: (
    result: R,
    value: any,
    key: string,
    object: Record<string, any>
  ) => void,
  accumulator: R
): R {
  for (const [key, value] of Object.entries(object)) {
    iteratee(accumulator, value, key, object);
  }

  return accumulator;
}
