/**
 * 不可变数组操作函数
 */

/**
 * 以不可变方式向数组末尾添加元素
 * @param array 源数组
 * @param items 要添加的元素
 * @returns 新数组，原数组不变
 */
export function immutablePush<T>(array: T[], ...items: T[]): T[] {
  return [...array, ...items];
}

/**
 * 以不可变方式移除数组最后一个元素
 * @param array 源数组
 * @returns 新数组，原数组不变
 */
export function immutablePop<T>(array: T[]): T[] {
  return array.slice(0, -1);
}

/**
 * 以不可变方式移除数组第一个元素
 * @param array 源数组
 * @returns 新数组，原数组不变
 */
export function immutableShift<T>(array: T[]): T[] {
  return array.slice(1);
}

/**
 * 以不可变方式向数组开头添加元素
 * @param array 源数组
 * @param items 要添加的元素
 * @returns 新数组，原数组不变
 */
export function immutableUnshift<T>(array: T[], ...items: T[]): T[] {
  return [...items, ...array];
}

/**
 * 以不可变方式对数组进行裁剪操作
 * @param array 源数组
 * @param start 开始位置
 * @param deleteCount 要删除的元素数量
 * @param items 要插入的元素
 * @returns 新数组，原数组不变
 */
export function immutableSplice<T>(
  array: T[],
  start: number,
  deleteCount: number,
  ...items: T[]
): T[] {
  const result = array.slice();
  result.splice(start, deleteCount, ...items);
  return result;
}

/**
 * 以不可变方式对数组进行排序
 * @param array 源数组
 * @param compareFn 比较函数
 * @returns 新排序后的数组，原数组不变
 */
export function immutableSort<T>(
  array: T[],
  compareFn?: (a: T, b: T) => number
): T[] {
  return [...array].sort(compareFn);
}

/**
 * 以不可变方式反转数组
 * @param array 源数组
 * @returns 新反转后的数组，原数组不变
 */
export function immutableReverse<T>(array: T[]): T[] {
  return [...array].reverse();
}
