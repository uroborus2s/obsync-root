/**
 * 数学运算相关函数
 */

/**
 * 计算数组中数字的总和
 * @param array 数字数组
 * @returns 数组中所有数字的总和
 */
export function sum(array: number[]): number {
  if (!array || array.length === 0) {
    return 0;
  }

  return array.reduce((total, num) => total + num, 0);
}

/**
 * 计算数组中数字的平均值
 * @param array 数字数组
 * @returns 数组中所有数字的平均值，空数组返回0
 */
export function average(array: number[]): number {
  if (!array || array.length === 0) {
    return 0;
  }

  return sum(array) / array.length;
}

/**
 * 获取数组中的最大值
 * @param array 数字数组
 * @returns 数组中的最大值，空数组返回-Infinity
 */
export function max(array: number[]): number {
  if (!array || array.length === 0) {
    return -Infinity;
  }

  return Math.max(...array);
}

/**
 * 获取数组中的最小值
 * @param array 数字数组
 * @returns 数组中的最小值，空数组返回Infinity
 */
export function min(array: number[]): number {
  if (!array || array.length === 0) {
    return Infinity;
  }

  return Math.min(...array);
}
