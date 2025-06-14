/**
 * 字符串变换相关函数
 *
 * 本模块提供字符串的基本变换操作，包括大小写转换、填充、裁剪和检查等功能。
 *
 * @packageDocumentation
 */

/**
 * 去除字符串两端的空格或指定字符
 *
 * @param str - 要处理的字符串
 * @param chars - 要去除的字符，默认为空格
 * @returns 处理后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串变换
 *
 * @example
 * ```typescript
 * trim('  hello  ');        // 'hello'
 * trim('-_-hello-_-', '-_');// 'hello'
 * ```
 * @public
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
 * 将字符串的第一个字符转换为大写，其余部分不变
 *
 * @param str - 要处理的字符串
 * @returns 处理后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串变换
 *
 * @example
 * ```typescript
 * capitalize('hello');  // 'Hello'
 * capitalize('HELLO');  // 'HELLO'
 * capitalize('');       // ''
 * ```
 * @public
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 将字符串的第一个字符转换为大写，其余部分转换为小写
 *
 * @param str - 要处理的字符串
 * @returns 处理后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串变换
 *
 * @example
 * ```typescript
 * capitalizeAll('hello');  // 'Hello'
 * capitalizeAll('HELLO');  // 'Hello'
 * capitalizeAll('');       // ''
 * ```
 * @public
 */
export function capitalizeAll(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 在字符串左侧填充指定字符，直到达到指定长度
 *
 * 如果字符串长度小于指定长度，则在左侧添加填充字符，直到达到指定长度。
 *
 * @param str - 要填充的字符串
 * @param length - 目标长度
 * @param chars - 填充字符，默认为空格
 * @returns 填充后的字符串
 * @throws 如果输入不是字符串，可能会抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串填充
 *
 * @example
 * ```typescript
 * padStart('7', 2, '0');     // '07'
 * padStart('hello', 10);     // '     hello'
 * padStart('hello', 3);      // 'hello'（原字符串已超过目标长度，原样返回）
 * ```
 * @public
 */
export function padStart(
  str: string,
  length: number,
  chars: string = ' '
): string {
  if (!str) return str;
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
 *
 * 如果字符串长度小于指定长度，则在右侧添加填充字符，直到达到指定长度。
 *
 * @param str - 要填充的字符串
 * @param length - 目标长度
 * @param chars - 填充字符，默认为空格
 * @returns 填充后的字符串
 * @throws 如果输入不是字符串，可能会抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串填充
 *
 * @example
 * ```typescript
 * padEnd('7', 2, '0');     // '70'
 * padEnd('hello', 10);     // 'hello     '
 * padEnd('hello', 3);      // 'hello'（原字符串已超过目标长度，原样返回）
 * ```
 * @public
 */
export function padEnd(
  str: string,
  length: number,
  chars: string = ' '
): string {
  if (!str) return str;
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
 *
 * 判断字符串从指定位置开始是否匹配目标字符串。可以指定开始搜索的位置。
 *
 * @param str - 要检查的字符串
 * @param target - 要搜索的目标字符串
 * @param position - 开始搜索的位置，默认为0
 * @returns 如果字符串以目标字符串开头，则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串检查
 *
 * @example
 * ```typescript
 * startsWith('hello world', 'hello');     // true
 * startsWith('hello world', 'world');     // false
 * startsWith('hello world', 'world', 6);  // true
 * ```
 * @public
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
 *
 * 判断字符串直到指定位置为止是否以目标字符串结尾。可以指定结束搜索的位置。
 *
 * @param str - 要检查的字符串
 * @param target - 要搜索的目标字符串
 * @param position - 结束搜索的位置，默认为字符串长度
 * @returns 如果字符串以目标字符串结尾，则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串检查
 *
 * @example
 * ```typescript
 * endsWith('hello world', 'world');     // true
 * endsWith('hello world', 'hello');     // false
 * endsWith('hello world', 'hello', 5);  // true
 * ```
 * @public
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
  const subjectString = String(str);
  const searchString = String(target);
  let len = subjectString.length;

  if (position !== undefined) {
    len = Math.min(position, len);
  }

  const start = len - searchString.length;
  return start >= 0 && subjectString.slice(start, len) === searchString;
}

/**
 * 将字符串转换为小写
 *
 * @param str - 要转换的字符串
 * @returns 转换后的小写字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串变换
 *
 * @example
 * ```typescript
 * toLowerCase('Hello WORLD'); // 'hello world'
 * ```
 * @public
 */
export function toLowerCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase();
}

/**
 * 将字符串转换为大写
 *
 * @param str - 要转换的字符串
 * @returns 转换后的大写字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串变换
 *
 * @example
 * ```typescript
 * toUpperCase('Hello world'); // 'HELLO WORLD'
 * ```
 * @public
 */
export function toUpperCase(str: string): string {
  if (!str) return str;
  return str.toUpperCase();
}

/**
 * 转义正则表达式中的特殊字符
 *
 * 内部工具函数，用于安全地在正则表达式中使用用户提供的字符串
 *
 * @param str - 要转义的字符串
 * @returns 转义后的字符串
 * @internal
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
