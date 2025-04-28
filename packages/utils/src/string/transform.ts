/**
 * 字符串转换相关函数
 */

/**
 * 去除字符串两端的空格或指定字符
 * @param str 要处理的字符串
 * @param chars 要去除的字符，默认为空格
 * @returns 处理后的字符串
 */
export function trim(str: string, chars?: string): string {
  if (!str) return str;

  if (!chars) {
    return str.trim();
  }

  const pattern = new RegExp(
    `^[${escapeRegExp(chars)}]+|[${escapeRegExp(chars)}]+$`,
    'g'
  );
  return str.replace(pattern, '');
}

/**
 * 将字符串的第一个字符转换为大写，其余部分转换为小写
 * @param str 要处理的字符串
 * @returns 处理后的字符串
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 在字符串左侧填充指定字符，直到达到指定长度
 * @param str 要填充的字符串
 * @param length 目标长度
 * @param chars 填充字符，默认为空格
 * @returns 填充后的字符串
 */
export function padStart(
  str: string,
  length: number,
  chars: string = ' '
): string {
  if (str.length >= length) return str;

  // 如果原生支持padStart，则使用原生方法
  if (typeof str.padStart === 'function') {
    return str.padStart(length, chars);
  }

  // 自定义实现
  const padLength = length - str.length;
  let padding = '';

  // 构建填充字符串
  while (padding.length < padLength) {
    padding += chars;
  }

  return padding.slice(0, padLength) + str;
}

/**
 * 在字符串右侧填充指定字符，直到达到指定长度
 * @param str 要填充的字符串
 * @param length 目标长度
 * @param chars 填充字符，默认为空格
 * @returns 填充后的字符串
 */
export function padEnd(
  str: string,
  length: number,
  chars: string = ' '
): string {
  if (str.length >= length) return str;

  // 如果原生支持padEnd，则使用原生方法
  if (typeof str.padEnd === 'function') {
    return str.padEnd(length, chars);
  }

  // 自定义实现
  const padLength = length - str.length;
  let padding = '';

  // 构建填充字符串
  while (padding.length < padLength) {
    padding += chars;
  }

  return str + padding.slice(0, padLength);
}

/**
 * 检查字符串是否以指定的目标字符串开头
 * @param str 要检查的字符串
 * @param target 要搜索的目标字符串
 * @param position 开始搜索的位置，默认为0
 * @returns 如果字符串以目标字符串开头，则返回true，否则返回false
 */
export function startsWith(
  str: string,
  target: string,
  position: number = 0
): boolean {
  if (!str || !target) return false;

  // 如果原生支持startsWith，则使用原生方法
  if (typeof str.startsWith === 'function') {
    return str.startsWith(target, position);
  }

  // 自定义实现
  position = Math.max(0, Math.min(position, str.length));
  return str.slice(position, position + target.length) === target;
}

/**
 * 检查字符串是否以指定的目标字符串结尾
 * @param str 要检查的字符串
 * @param target 要搜索的目标字符串
 * @param position 结束搜索的位置，默认为字符串长度
 * @returns 如果字符串以目标字符串结尾，则返回true，否则返回false
 */
export function endsWith(
  str: string,
  target: string,
  position?: number
): boolean {
  if (!str || !target) return false;

  // 如果原生支持endsWith，则使用原生方法
  if (typeof str.endsWith === 'function') {
    return str.endsWith(target, position);
  }

  // 自定义实现
  const len = str.length;
  position = position === undefined ? len : Math.min(position, len);
  const start = position - target.length;

  return start >= 0 && str.slice(start, position) === target;
}

/**
 * 转义正则表达式特殊字符
 * 辅助函数，用于trim函数
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $&表示整个匹配的字符串
}
