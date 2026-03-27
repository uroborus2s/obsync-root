/**
 * 数组操作工具函数，提供数组转换、过滤、查找、排序等操作
 *
 * 该模块包含了丰富的数组处理函数，帮助开发者高效地处理和转换数组数据。
 * 功能涵盖数组分割、去重、查找、排序、分组、扁平化等常用操作，超越了JavaScript
 * 原生数组方法的功能范围。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组操作
 *
 * @example
 * ```typescript
 * import { chunk, unique, groupBy } from '@stratix/utils/data/array';
 *
 * // 将数组分割成小数组
 * chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
 *
 * // 数组去重
 * unique([1, 1, 2, 2, 3]); // [1, 2, 3]
 *
 * // 数组分组
 * groupBy([{ id: 1, type: 'A' }, { id: 2, type: 'B' }, { id: 3, type: 'A' }], 'type');
 * // { A: [{ id: 1, type: 'A' }, { id: 3, type: 'A' }], B: [{ id: 2, type: 'B' }] }
 * ```
 *
 * @packageDocumentation
 */

/**
 * 将数组分割成指定大小的多个小数组
 *
 * 将一个数组分割成指定大小的多个较小数组。如果数组不能被平均分割，最后一个数组将包含剩余元素。
 *
 * @param array - 要分割的数组
 * @param size - 每个小数组的大小，默认为1
 * @returns 包含小数组的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组转换
 *
 * @example
 * ```typescript
 * // 将数组分成大小为2的小数组
 * chunk([1, 2, 3, 4, 5], 2);
 * // 输出: [[1, 2], [3, 4], [5]]
 *
 * // 当size为1时
 * chunk(['a', 'b', 'c'], 1);
 * // 输出: [['a'], ['b'], ['c']]
 * ```
 * @public
 */
export function chunk<T>(array: T[], size: number = 1): T[][] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (size < 1) {
    return [];
  }

  const result: T[][] = [];
  const { length } = array;

  for (let i = 0; i < length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}

/**
 * 创建一个去除假值的新数组
 *
 * 从数组中移除所有假值。JavaScript 中的假值包括 `false`、`null`、`0`、`""`、
 * `undefined` 和 `NaN`。
 *
 * @param array - 要处理的数组
 * @returns 去除假值后的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组过滤
 *
 * @example
 * ```typescript
 * // 移除所有假值
 * compact([0, 1, false, 2, '', 3, null, undefined, NaN]);
 * // 输出: [1, 2, 3]
 * ```
 * @public
 */
export function compact<T>(array: T[]): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  return array.filter(Boolean);
}

/**
 * 创建一个新数组，包含在第一个数组中但不在其他数组中的值
 *
 * 返回一个新数组，其中包含存在于第一个数组中但不存在于其他数组中的值。
 * 使用Set数据结构实现高效比较。
 *
 * @param array - 要检查的数组
 * @param values - 要排除的值的数组
 * @returns 过滤后的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组比较
 *
 * @example
 * ```typescript
 * // 查找数组差集
 * difference([1, 2, 3, 4], [2, 4], [1, 3]);
 * // 输出: []
 *
 * difference([1, 2, 3, 4, 5], [2, 4]);
 * // 输出: [1, 3, 5]
 * ```
 * @public
 */
export function difference<T>(array: T[], ...values: T[][]): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (values.length === 0) {
    return array.slice();
  }

  const excludeSet = new Set(values.flat());
  return array.filter((item) => !excludeSet.has(item));
}

/**
 * 将嵌套数组扁平化到指定深度
 *
 * 递归地将嵌套数组扁平化到指定的深度。
 *
 * @param array - 要扁平化的数组
 * @param depth - 扁平化的深度，默认为1
 * @returns 扁平化后的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组转换
 *
 * @example
 * ```typescript
 * // 扁平化一级嵌套
 * flatten([1, [2, 3], 4]);
 * // 输出: [1, 2, 3, 4]
 *
 * // 扁平化两级嵌套
 * flatten([1, [2, [3, 4]], 5], 2);
 * // 输出: [1, 2, 3, 4, 5]
 *
 * // 完全扁平化（无限深度）
 * flatten([1, [2, [3, [4]]], 5], Infinity);
 * // 输出: [1, 2, 3, 4, 5]
 * ```
 * @public
 */
export function flatten<T>(array: any[], depth: number = 1): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (depth < 1) {
    return array.slice() as T[];
  }

  return array.reduce((acc: any[], val) => {
    return acc.concat(
      Array.isArray(val) && depth > 1 ? flatten(val, depth - 1) : val
    );
  }, []) as T[];
}

/**
 * 按照指定条件对数组进行分组
 *
 * 创建一个对象，其键是对数组中每个元素执行迭代函数的结果，值是包含属于该分组的元素的数组。
 * 支持传入字符串属性名或函数作为分组条件。
 *
 * @param array - 要分组的数组
 * @param iteratee - 分组依据，可以是属性名或函数
 * @returns 分组后的对象
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组分组
 *
 * @example
 * ```typescript
 * // 按照属性分组
 * const users = [
 *   { id: 1, role: 'admin' },
 *   { id: 2, role: 'user' },
 *   { id: 3, role: 'admin' }
 * ];
 * groupBy(users, 'role');
 * // 输出: { admin: [{ id: 1, role: 'admin' }, { id: 3, role: 'admin' }], user: [{ id: 2, role: 'user' }] }
 *
 * // 使用函数分组
 * groupBy([1.2, 2.3, 3.4], Math.floor);
 * // 输出: { 1: [1.2], 2: [2.3], 3: [3.4] }
 * ```
 * @public
 */
export function groupBy<T>(
  array: T[],
  iteratee: ((item: T) => any) | string
): Record<string, T[]> {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  const result: Record<string, T[]> = {};
  const getKey =
    typeof iteratee === 'function'
      ? iteratee
      : (item: T) => (item as any)[iteratee];

  for (const item of array) {
    const key = String(getKey(item));
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }

  return result;
}

/**
 * 创建一个键值映射对象
 *
 * 创建一个对象，其键是对数组中每个元素执行迭代函数的结果，值是对应的元素。
 * 如果多个元素产生相同的键，则后面的元素会覆盖前面的元素。
 *
 * @example
 * ```typescript
 * // 使用属性作为键
 * keyBy([{ id: 'a', val: 1 }, { id: 'b', val: 2 }, { id: 'c', val: 3 }], 'id');
 * // 输出: { a: { id: 'a', val: 1 }, b: { id: 'b', val: 2 }, c: { id: 'c', val: 3 } }
 *
 * // 使用函数生成键
 * keyBy(['a', 'b', 'c'], String.prototype.toUpperCase);
 * // 输出: { A: 'a', B: 'b', C: 'c' }
 * ```
 *
 * @param array - 要处理的数组
 * @param iteratee - 生成键的方法，可以是属性名或函数
 * @returns 生成的键值对象
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象转换
 *
 * @public
 */
export function keyBy<T>(
  array: T[],
  iteratee: ((item: T) => any) | string
): Record<string, T> {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  const result: Record<string, T> = {};
  const getKey =
    typeof iteratee === 'function'
      ? iteratee
      : (item: T) => (item as any)[iteratee];

  for (const item of array) {
    const key = String(getKey(item));
    result[key] = item;
  }

  return result;
}

/**
 * 计算多个数组的交集
 *
 * 创建一个新数组，包含所有传入数组中共有的元素。
 *
 * @example
 * ```typescript
 * // 两个数组的交集
 * intersection([1, 2, 3], [2, 3, 4]);
 * // 输出: [2, 3]
 *
 * // 多个数组的交集
 * intersection([1, 2, 3], [2, 3, 4], [3, 4, 5]);
 * // 输出: [3]
 * ```
 *
 * @param arrays - 要计算交集的数组列表
 * @returns 包含交集元素的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组比较
 *
 * @public
 */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) {
    return [];
  }

  if (!arrays.every(Array.isArray)) {
    throw new TypeError('Expected all arguments to be arrays');
  }

  if (arrays.length === 1) {
    return [...new Set(arrays[0])];
  }

  return [...new Set(arrays[0])].filter((item) =>
    arrays.every((array) => array.includes(item))
  );
}

/**
 * 将数组分割成两部分
 *
 * 根据断言函数将数组元素分为两个组：满足条件的元素和不满足条件的元素。
 *
 * @example
 * ```typescript
 * // 按条件分组
 * partition([1, 2, 3, 4, 5], n => n % 2 === 0);
 * // 输出: [[2, 4], [1, 3, 5]]
 *
 * // 分离对象数组
 * partition(
 *   [{active: true, name: 'A'}, {active: false, name: 'B'}, {active: true, name: 'C'}],
 *   item => item.active
 * );
 * // 输出: [[{active: true, name: 'A'}, {active: true, name: 'C'}], [{active: false, name: 'B'}]]
 * ```
 *
 * @param array - 要分割的数组
 * @param predicate - 断言函数，返回true表示元素放入第一组
 * @returns 包含两个数组的元组，第一个数组包含满足条件的元素，第二个数组包含不满足条件的元素
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组分割
 *
 * @public
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
}

/**
 * 对数组中的每个元素执行累积计算
 *
 * 从左到右对数组中的每个元素执行提供的函数，将其结果汇总为单个返回值。
 * 本函数是原生Array.reduce的类型安全包装。
 *
 * @example
 * ```typescript
 * // 数字求和
 * reduce([1, 2, 3, 4], (sum, n) => sum + n, 0);
 * // 输出: 10
 *
 * // 构建对象
 * reduce(['a', 'b', 'c'], (obj, char, i) => {
 *   obj[char] = i;
 *   return obj;
 * }, {} as Record<string, number>);
 * // 输出: { a: 0, b: 1, c: 2 }
 * ```
 *
 * @param array - 要归约的数组
 * @param iteratee - 归约函数，接收累积值、当前元素、索引和原数组
 * @param initialValue - 归约的初始值
 * @returns 归约后的结果
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组归约
 *
 * @public
 */
export function reduce<T, R>(
  array: T[],
  iteratee: (accumulator: R, current: T, index: number, array: T[]) => R,
  initialValue: R
): R {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  return array.reduce(iteratee, initialValue);
}

/**
 * 创建随机排序的数组副本
 *
 * 使用Fisher-Yates洗牌算法创建原数组的随机排序副本。
 *
 * @example
 * ```typescript
 * // 随机排序数组
 * shuffle([1, 2, 3, 4, 5]);
 * // 可能输出: [3, 1, 5, 2, 4]
 * ```
 *
 * @param array - 要随机排序的数组
 * @returns 随机排序的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组变换
 *
 * @public
 */
export function shuffle<T>(array: T[]): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  const result = array.slice();
  const { length } = result;

  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * 创建按照指定条件排序的数组副本
 *
 * 根据迭代函数的结果对数组元素进行排序。支持多个排序条件。
 *
 * @example
 * ```typescript
 * // 按单个属性排序
 * sortBy([{name: 'Alice', age: 30}, {name: 'Bob', age: 25}], 'age');
 * // 输出: [{name: 'Bob', age: 25}, {name: 'Alice', age: 30}]
 *
 * // 按多个条件排序
 * sortBy(
 *   [{name: 'Alice', score: 90}, {name: 'Bob', score: 80}, {name: 'Carol', score: 90}],
 *   ['score', 'name']
 * );
 * // 输出: [{name: 'Bob', score: 80}, {name: 'Alice', score: 90}, {name: 'Carol', score: 90}]
 *
 * // 使用函数排序
 * sortBy([1, 2, 3, 4, 5], num => Math.sin(num));
 * // 按正弦值排序
 * ```
 *
 * @param array - 要排序的数组
 * @param iteratees - 排序依据，可以是属性名、属性名数组或函数
 * @returns 排序后的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组排序
 *
 * @public
 */
export function sortBy<T>(
  array: T[],
  iteratees: Array<((item: T) => any) | string> | ((item: T) => any) | string
): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (array.length <= 1) {
    return array.slice();
  }

  const normalizedIteratees = Array.isArray(iteratees)
    ? iteratees
    : [iteratees];

  const getters = normalizedIteratees.map((iteratee) =>
    typeof iteratee === 'function'
      ? iteratee
      : (item: T) => (item as any)[iteratee]
  );

  return array.slice().sort((a, b) => {
    for (const getter of getters) {
      const aValue = getter(a);
      const bValue = getter(b);

      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
    }
    return 0;
  });
}

/**
 * 获取数组的前N个元素
 *
 * 创建一个数组切片，包含从开头截取的N个元素。
 *
 * @example
 * ```typescript
 * // 获取前两个元素
 * take([1, 2, 3, 4, 5], 2);
 * // 输出: [1, 2]
 *
 * // 默认获取第一个元素
 * take(['a', 'b', 'c']);
 * // 输出: ['a']
 *
 * // n大于数组长度
 * take([1, 2], 5);
 * // 输出: [1, 2]
 * ```
 *
 * @param array - 要截取的数组
 * @param n - 要截取的元素数量，默认为1
 * @returns 截取的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组切片
 *
 * @public
 */
export function take<T>(array: T[], n: number = 1): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (n < 1) {
    return [];
  }

  return array.slice(0, n);
}

/**
 * 创建一个包含所有数组唯一值的数组
 *
 * 合并所有传入的数组，并返回一个包含所有唯一值的新数组。
 *
 * @example
 * ```typescript
 * // 合并多个数组并去重
 * union([1, 2], [2, 3], [3, 4]);
 * // 输出: [1, 2, 3, 4]
 * ```
 *
 * @param arrays - 要合并的数组列表
 * @returns 包含所有唯一值的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组合并
 *
 * @public
 */
export function union<T>(...arrays: T[][]): T[] {
  if (!arrays.every(Array.isArray)) {
    throw new TypeError('Expected all arguments to be arrays');
  }

  return [...new Set(arrays.flat())];
}

/**
 * 创建一个去重后的数组
 *
 * 创建一个新数组，移除所有重复值，可以通过迭代函数指定唯一性判断条件。
 *
 * @example
 * ```typescript
 * // 基本去重
 * unique([1, 1, 2, 2, 3]);
 * // 输出: [1, 2, 3]
 *
 * // 按对象属性去重
 * unique(
 *   [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 1, name: 'Carol' }],
 *   'id'
 * );
 * // 输出: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
 *
 * // 使用函数确定唯一性
 * unique([2.1, 1.2, 2.3], Math.floor);
 * // 输出: [2.1, 1.2]
 * ```
 *
 * @param array - 要去重的数组
 * @param iteratee - 迭代函数或属性名，用于获取用于唯一性比较的值
 * @returns 去重后的新数组
 * @throws `TypeError` 如果传入的不是数组则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组去重
 *
 * @public
 */
export function unique<T>(
  array: T[],
  iteratee?: ((item: T) => any) | string
): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (array.length <= 1) {
    return array.slice();
  }

  if (iteratee === undefined) {
    return [...new Set(array)];
  }

  const getKey =
    typeof iteratee === 'function'
      ? iteratee
      : (item: T) => (item as any)[iteratee];

  const seen = new Set<any>();
  const result: T[] = [];

  for (const item of array) {
    const key = getKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}
