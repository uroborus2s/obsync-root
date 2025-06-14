/**
 * 数学运算相关函数
 *
 * 提供基本的数学运算函数，包括求和、平均值、最大值和最小值。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 数字计算
 *
 * @packageDocumentation
 */

/**
 * 计算数组中数字的总和
 *
 * @param array - 数字数组
 * @returns 数组中所有数字的总和
 * @throws `TypeError` 如果数组元素不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组运算
 *
 * @example
 * ```typescript
 * sum([1, 2, 3, 4]);  // 10
 * sum([]);            // 0
 * ```
 * @public
 */
export function sum(array: number[]): number {
  if (!array || array.length === 0) {
    return 0;
  }

  return array.reduce((total, num) => total + num, 0);
}

/**
 * 计算数组中数字的平均值
 *
 * @param array - 数字数组
 * @returns 数组中所有数字的平均值，空数组返回0
 * @throws `TypeError` 如果数组元素不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组运算
 *
 * @example
 * ```typescript
 * average([1, 2, 3, 4]);  // 2.5
 * average([]);            // 0
 * ```
 * @public
 */
export function average(array: number[]): number {
  if (!array || array.length === 0) {
    return 0;
  }

  return sum(array) / array.length;
}

/**
 * 获取数组中的最大值
 *
 * @param array - 数字数组
 * @returns 数组中的最大值，空数组返回-Infinity
 * @throws `TypeError` 如果数组元素不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组运算
 *
 * @example
 * ```typescript
 * max([1, 2, 3, 4]);  // 4
 * max([]);            // -Infinity
 * ```
 * @public
 */
export function max(array: number[]): number {
  if (!array || array.length === 0) {
    return -Infinity;
  }

  return Math.max(...array);
}

/**
 * 获取数组中的最小值
 *
 * @param array - 数字数组
 * @returns 数组中的最小值，空数组返回Infinity
 * @throws `TypeError` 如果数组元素不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数组运算
 *
 * @example
 * ```typescript
 * min([1, 2, 3, 4]);  // 1
 * min([]);            // Infinity
 * ```
 * @public
 */
export function min(array: number[]): number {
  if (!array || array.length === 0) {
    return Infinity;
  }

  return Math.min(...array);
}
