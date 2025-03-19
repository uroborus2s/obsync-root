/**
 * 检查数字是否为整数，否则返回默认值
 * @param {number | string | null | undefined} num
 * @param {number} defaultValue
 * @returns {number}
 */
export function resolveNumber(
  num: number | string | null | undefined,
  defaultValue: number
): number {
  if (num == null) return defaultValue;
  if (typeof num === 'string') num = Number.parseInt(num, 10);
  if (typeof num !== 'number') return defaultValue;
  if (!Number.isFinite(num)) return defaultValue;
  return num;
}

/**
 * 检查数字是否为正整数，否则返回默认值
 * @param {number | string | null | undefined} num
 * @param {number} defaultValue
 * @returns {number}
 */
export function resolvePositiveNumber(
  num: number | string | null | undefined,
  defaultValue: number
): number {
  const resolvedNumber = resolveNumber(num, defaultValue);
  return resolvedNumber > 0 ? resolvedNumber : defaultValue;
}

/**
 * 获取高精度时间戳
 * 该函数会根据运行环境选择合适的方法来获取高精度时间戳。
 * 在Node.js环境中，使用`process.hrtime.bigint()`获取纳秒级别的时间戳。
 * 在浏览器环境中，使用`performance.now()`获取毫秒级别的时间戳，并将其转换为微秒级别的`BigInt`。
 * 如果当前环境既不是Node.js也不是浏览器，或者无法获取高精度时间戳，则抛出一个错误。
 * @returns {bigint} 返回当前时间的高精度时间戳，单位为微秒。
 * @throws {Error} 如果无法获取高精度时间戳，则抛出错误。
 */
export function hrtime() {
  if (
    typeof process !== 'undefined' &&
    process.hrtime &&
    process.hrtime.bigint
  ) {
    // 在Node.js环境中使用process.hrtime.bigint()
    return process.hrtime.bigint();
  } else if (typeof performance !== 'undefined' && performance.now) {
    // 在浏览器环境中使用performance.now()
    const now = performance.now();
    return BigInt(Math.floor(now * 1e6)); // 将毫秒转换为微秒，并转换为BigInt
  } else {
    throw new Error('无法获取高精度时间戳');
  }
}
