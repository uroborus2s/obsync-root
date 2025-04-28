/**
 * 随机数生成相关函数
 */

/**
 * 生成一个指定范围内的随机数
 * @param lower 下限，默认为0
 * @param upper 上限，默认为1
 * @param floating 是否返回浮点数，默认根据参数自动判断
 * @returns 生成的随机数
 */
export function random(
  lower: number = 0,
  upper: number = 1,
  floating?: boolean
): number {
  // 如果只提供了一个参数，则lower为0，upper为lower
  if (arguments.length === 1) {
    upper = lower;
    lower = 0;
  }

  // 确保lower小于upper
  if (lower > upper) {
    [lower, upper] = [upper, lower];
  }

  // 确定是否返回浮点数
  // 如果明确指定了floating，使用指定值；否则根据lower和upper是否有小数部分自动判断
  const shouldFloat =
    floating !== undefined ? floating : lower % 1 !== 0 || upper % 1 !== 0;

  if (shouldFloat) {
    // 生成浮点数
    return lower + Math.random() * (upper - lower);
  } else {
    // 生成整数
    lower = Math.ceil(lower);
    upper = Math.floor(upper);
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  }
}
