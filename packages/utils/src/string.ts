/**
 * 字符串工具函数
 */

/**
 * 转换为驼峰命名
 * @param str 输入字符串
 * @returns 驼峰命名字符串
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

/**
 * 转换为帕斯卡命名
 * @param str 输入字符串
 * @returns 帕斯卡命名字符串
 */
export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * 转换为蛇形命名
 * @param str 输入字符串
 * @returns 蛇形命名字符串
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * 转换为短横线命名
 * @param str 输入字符串
 * @returns 短横线命名字符串
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/[-_\s]+/g, '-')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * 转换为复数形式
 * @param str 输入字符串
 * @returns 复数形式字符串
 */
export function pluralize(str: string): string {
  if (!str) return str;

  // 简单的复数规则
  const rules: [RegExp, string][] = [
    [/([^aeiou])y$/i, '$1ies'],
    [/(x|ch|ss|sh)$/i, '$1es'],
    [/([^s])$/i, '$1s']
  ];

  // 特殊情况
  const irregulars: Record<string, string> = {
    person: 'people',
    man: 'men',
    child: 'children',
    foot: 'feet',
    tooth: 'teeth',
    goose: 'geese',
    mouse: 'mice'
  };

  const lower = str.toLowerCase();

  // 检查特殊情况
  if (irregulars[lower]) {
    return irregulars[lower];
  }

  // 应用规则
  for (const [regex, replacement] of rules) {
    if (regex.test(str)) {
      return str.replace(regex, replacement);
    }
  }

  return str;
}

/**
 * 转换为单数形式
 * @param str 输入字符串
 * @returns 单数形式字符串
 */
export function singularize(str: string): string {
  if (!str) return str;

  // 简单的单数规则
  const rules: [RegExp, string][] = [
    [/ies$/i, 'y'],
    [/(x|ch|ss|sh)es$/i, '$1'],
    [/([^s])s$/i, '$1']
  ];

  // 特殊情况
  const irregulars: Record<string, string> = {
    people: 'person',
    men: 'man',
    children: 'child',
    feet: 'foot',
    teeth: 'tooth',
    geese: 'goose',
    mice: 'mouse'
  };

  const lower = str.toLowerCase();

  // 检查特殊情况
  if (irregulars[lower]) {
    return irregulars[lower];
  }

  // 应用规则
  for (const [regex, replacement] of rules) {
    if (regex.test(str)) {
      return str.replace(regex, replacement);
    }
  }

  return str;
}
