/**
 * 数字验证相关函数
 */

/**
 * 检查值是否为有效数字（不包括NaN和Infinity）
 * @param value 要检查的值
 * @returns 如果值是有效数字，则返回true，否则返回false
 */
export function isNumber(value: any): boolean {
  return typeof value === 'number' && isFinite(value);
}

/**
 * 检查值是否为整数
 * @param value 要检查的值
 * @returns 如果值是整数，则返回true，否则返回false
 */
export function isInteger(value: any): boolean {
  return isNumber(value) && Math.floor(value) === value;
}

/**
 * 检查值是否为浮点数（带小数部分的数字）
 * @param value 要检查的值
 * @returns 如果值是浮点数，则返回true，否则返回false
 */
export function isFloat(value: any): boolean {
  return isNumber(value) && !isInteger(value);
}
