/**
 * 数字范围相关函数
 *
 * 提供数字范围相关的工具函数，用于检查和限制数字范围
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 数字操作
 *
 * @packageDocumentation
 */

/**
 * 将数字限制在指定的范围内
 *
 * @param number - 要限制的数字
 * @param lower - 下限
 * @param upper - 上限
 * @returns 限制后的数字
 * @throws `TypeError` 如果参数不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 范围操作
 *
 * @example
 * ```typescript
 * clamp(5, 0, 10);  // 5 (在范围内，不变)
 * clamp(-5, 0, 10); // 0 (小于下限，返回下限)
 * clamp(15, 0, 10); // 10 (大于上限，返回上限)
 * ```
 * @public
 */
export function clamp(number: number, lower: number, upper: number): number {
  if (number < lower) {
    return lower;
  }
  if (number > upper) {
    return upper;
  }
  return number;
}

/**
 * 检查数字是否在指定范围内
 *
 * 注意：此函数与validator.ts中的isInRange行为不同：
 * - inRange是半开区间[start, end)，包含起始值但不包含结束值
 * - isInRange是闭区间[min, max]，同时包含最小值和最大值
 * - inRange支持省略end参数，此时start视为结束值，起始值默认为0
 * - inRange会自动调整start和end的顺序，确保start &lt; end
 *
 * @param number - 要检查的数字
 * @param start - 范围起始值（包含）
 * @param end - 范围结束值（不包含），如果未提供，则start为0，end为start
 * @returns 如果数字在范围内，则返回true，否则返回false
 * @throws `TypeError` 如果参数不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 范围检查
 *
 * @example
 * ```typescript
 * inRange(3, 2, 5);  // true (3在[2,5)范围内)
 * inRange(5, 2, 5);  // false (5不在[2,5)范围内)
 * inRange(2, 2, 5);  // true (2在[2,5)范围内)
 * inRange(3, 5);     // true (3在[0,5)范围内)
 * inRange(5, 2);     // false (5不在[0,2)范围内)
 * inRange(1, 5, 2);  // true (会交换参数，1在[2,5)范围内)
 * ```
 * @public
 * @see isInRange 在validator模块中，用于检查闭区间[min, max]
 */
export function inRange(number: number, start: number, end?: number): boolean {
  // 如果只提供了一个参数，则start为0，end为start
  if (end === undefined) {
    end = start;
    start = 0;
  }

  // 确保start小于end
  if (start > end) {
    [start, end] = [end, start];
  }

  // 检查数字是否在范围内
  return number >= start && number < end;
}
