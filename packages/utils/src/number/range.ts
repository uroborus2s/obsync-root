/**
 * 数字范围相关函数
 */

/**
 * 将数字限制在指定的范围内
 * @param number 要限制的数字
 * @param lower 下限
 * @param upper 上限
 * @returns 限制后的数字
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
 * @param number 要检查的数字
 * @param start 范围起始值（包含）
 * @param end 范围结束值（不包含），如果未提供，则start为0，end为start
 * @returns 如果数字在范围内，则返回true，否则返回false
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
