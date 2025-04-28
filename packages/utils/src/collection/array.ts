/**
 * Collection模块 - 数组操作工具函数
 * 提供数组转换、过滤、查找、排序等常见操作
 */

/**
 * 将数组分割成指定大小的多个小数组
 * @param array 要分割的数组
 * @param size 每个小数组的大小，默认为1
 * @returns 包含小数组的新数组
 */
export function chunk<T>(array: T[], size: number = 1): T[][] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (size < 1) {
    return [];
  }

  const result: T[][] = [];
  const length = array.length;

  for (let i = 0; i < length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}

/**
 * 创建一个去除重复值的新数组
 * @param array 要去重的数组
 * @param iteratee 迭代函数，用于生成唯一性标准，或对象属性路径
 * @returns 没有重复值的新数组
 */
export function unique<T>(
  array: T[],
  iteratee?: ((item: T) => any) | string
): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (!iteratee) {
    return Array.from(new Set(array));
  }

  const iterateeFn =
    typeof iteratee === 'string'
      ? (item: T) => (item as any)[iteratee]
      : iteratee;

  const seen = new Set();
  return array.filter((item) => {
    const key = iterateeFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 创建一个对象，对象的键是通过对集合中每个元素运行迭代函数得到的结果，每个键对应的值是包含属于这个键的所有元素的数组
 * @param array 要分组的数组
 * @param iteratee 迭代函数，用于生成分组的键，或对象属性路径
 * @returns 分组后的对象
 */
export function groupBy<T>(
  array: T[],
  iteratee: ((item: T) => any) | string
): Record<string, T[]> {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  const iterateeFn =
    typeof iteratee === 'string'
      ? (item: T) => (item as any)[iteratee]
      : iteratee;

  return array.reduce((result: Record<string, T[]>, item) => {
    const key = String(iterateeFn(item));
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {});
}

/**
 * 将嵌套数组扁平化到指定深度
 * @param array 要扁平化的数组
 * @param depth 扁平化的深度，默认为1
 * @returns 扁平化后的新数组
 */
export function flatten<T>(array: any[], depth: number = 1): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  if (depth < 1) {
    return array.slice();
  }

  if (depth === Infinity) {
    return array.flat(Infinity) as T[];
  }

  return array.flat(depth) as T[];
}

/**
 * 创建一个根据迭代函数结果排序的数组
 * @param array 要排序的数组
 * @param iteratees 迭代函数，用于生成排序标准，或对象属性路径
 * @returns 排序后的新数组
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

  // 转换为数组形式
  const props = Array.isArray(iteratees) ? iteratees : [iteratees];

  // 创建排序函数
  const iterateeFns = props.map((prop) =>
    typeof prop === 'string' ? (item: T) => (item as any)[prop] : prop
  );

  return [...array].sort((a, b) => {
    for (let i = 0; i < iterateeFns.length; i++) {
      const iteratee = iterateeFns[i];
      const aValue = iteratee(a);
      const bValue = iteratee(b);

      if (aValue !== bValue) {
        return aValue < bValue ? -1 : 1;
      }
    }
    return 0;
  });
}

/**
 * 根据断言函数将数组分割成两个组：满足条件的元素和不满足条件的元素
 * @param array 要分割的数组
 * @param predicate 断言函数，用于判断元素属于哪个组
 * @returns 包含两个数组的数组，第一个数组包含满足条件的元素，第二个数组包含不满足条件的元素
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  const truthy: T[] = [];
  const falsey: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsey.push(item);
    }
  }

  return [truthy, falsey];
}

/**
 * 创建一个新数组，包含在第一个数组中但不在其他数组中的值
 * @param array 要检查的数组
 * @param values 要排除的值的数组
 * @returns 过滤后的新数组
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
 * 创建一个包含所有传入数组共有元素的新数组
 * @param arrays 要检查的数组
 * @returns 共有元素的新数组
 */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) {
    return [];
  }

  if (arrays.length === 1) {
    return arrays[0].slice();
  }

  return arrays.reduce((result, current) => {
    return result.filter((item) => current.includes(item));
  });
}

/**
 * 创建一个包含所有传入数组所有元素的新数组，去除重复项
 * @param arrays 要合并的数组
 * @returns 所有元素的新数组
 */
export function union<T>(...arrays: T[][]): T[] {
  return Array.from(new Set(arrays.flat()));
}

/**
 * 创建一个新数组，包含所有非假值的元素
 * @param array 要过滤的数组
 * @returns 过滤后的新数组
 */
export function compact<T>(array: T[]): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  return array.filter(Boolean);
}

/**
 * 创建一个新数组，包含所有元素经过迭代函数处理后的结果
 *
 * @description 与原生Array.map类似，但增加了类型检查和错误处理
 * 功能优势：
 * 1. 会检查输入是否为数组，非数组输入会抛出类型错误
 * 2. 提供完整的TypeScript类型支持
 *
 * @param array 要映射的数组
 * @param iteratee 迭代函数，用于处理每个元素
 * @returns 映射后的新数组
 * @throws {TypeError} 当输入不是数组时抛出
 */
export function map<T, R>(
  array: T[],
  iteratee: (item: T, index: number, array: T[]) => R
): R[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  return array.map(iteratee);
}

/**
 * 创建一个新数组，包含所有满足断言函数条件的元素
 *
 * @description 与原生Array.filter类似，但增加了类型检查和错误处理
 * 功能优势：
 * 1. 会检查输入是否为数组，非数组输入会抛出类型错误
 * 2. 提供完整的TypeScript类型支持
 *
 * @param array 要过滤的数组
 * @param predicate 断言函数，用于判断元素是否满足条件
 * @returns 过滤后的新数组
 * @throws {TypeError} 当输入不是数组时抛出
 */
export function filter<T>(
  array: T[],
  predicate: (item: T, index: number, array: T[]) => boolean
): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  return array.filter(predicate);
}

/**
 * 创建一个归约后的值
 *
 * @description 与原生Array.reduce类似，但增加了类型检查和错误处理
 * 功能优势：
 * 1. 会检查输入是否为数组，非数组输入会抛出类型错误
 * 2. 初始值是必需的，避免类型不明确的问题
 * 3. 提供完整的TypeScript类型支持
 *
 * @param array 要归约的数组
 * @param iteratee 归约函数，用于处理每个元素
 * @param initialValue 归约的初始值
 * @returns 归约后的值
 * @throws {TypeError} 当输入不是数组时抛出
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
 * 在数组中查找第一个满足条件的元素
 *
 * @description 与原生Array.find类似，但增加了类型检查和错误处理
 * 功能优势：
 * 1. 会检查输入是否为数组，非数组输入会抛出类型错误
 * 2. 提供完整的TypeScript类型支持
 *
 * @param array 要查找的数组
 * @param predicate 断言函数，用于判断元素是否满足条件
 * @returns 满足条件的元素，如果没有找到则返回undefined
 * @throws {TypeError} 当输入不是数组时抛出
 */
export function find<T>(
  array: T[],
  predicate: (item: T, index: number, array: T[]) => boolean
): T | undefined {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  return array.find(predicate);
}

/**
 * 在数组中查找第一个满足条件的元素的索引
 *
 * @description 与原生Array.findIndex类似，但增加了类型检查和错误处理
 * 功能优势：
 * 1. 会检查输入是否为数组，非数组输入会抛出类型错误
 * 2. 提供完整的TypeScript类型支持
 *
 * @param array 要查找的数组
 * @param predicate 断言函数，用于判断元素是否满足条件
 * @returns 满足条件的元素的索引，如果没有找到则返回-1
 * @throws {TypeError} 当输入不是数组时抛出
 */
export function findIndex<T>(
  array: T[],
  predicate: (item: T, index: number, array: T[]) => boolean
): number {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  return array.findIndex(predicate);
}

/**
 * 创建一个新数组，包含数组的前n个元素
 * @param array 要获取子数组的数组
 * @param n 要获取的元素数量
 * @returns 包含前n个元素的新数组
 */
export function take<T>(array: T[], n: number = 1): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  return array.slice(0, n);
}

/**
 * 创建一个随机排序的新数组
 * @param array 要随机排序的数组
 * @returns 随机排序后的新数组
 */
export function shuffle<T>(array: T[]): T[] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  const result = array.slice();

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
