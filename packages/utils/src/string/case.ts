/**
 * 命名转换相关函数
 */

/**
 * 将字符串转换为驼峰式命名（小驼峰）
 * @param string 要处理的字符串
 * @returns 处理后的字符串
 */
export function camelCase(string: string): string {
  if (!string) return string;

  return string
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/[\s_-]+/g, '');
}

/**
 * 将字符串转换为帕斯卡命名（大驼峰）
 * @param string 要处理的字符串
 * @returns 处理后的字符串
 */
export function pascalCase(string: string): string {
  if (!string) return string;

  return string
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter) => letter.toUpperCase())
    .replace(/[\s_-]+/g, '');
}

/**
 * 将字符串转换为下划线命名
 * @param string 要处理的字符串
 * @returns 处理后的字符串
 */
export function snakeCase(string: string): string {
  if (!string) return string;

  return string
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * 将字符串转换为短横线命名（中横线命名）
 * @param string 要处理的字符串
 * @returns 处理后的字符串
 */
export function kebabCase(string: string): string {
  if (!string) return string;

  return string
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
