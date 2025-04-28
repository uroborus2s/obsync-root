/**
 * 复数形式相关函数
 */

// 定义规则类型
type Rule = [RegExp, string];

// 简单的复数规则列表
const PLURALIZATION_RULES: Rule[] = [
  [/([^aeiou])y$/i, '$1ies'],
  [/(ch|sh|ss|x|z)$/i, '$1es'],
  [/(s)$/i, '$1'],
  [/([^s])$/i, '$1s']
];

// 简单的单数规则列表
const SINGULARIZATION_RULES: Rule[] = [
  [/([^aeiou])ies$/i, '$1y'],
  [/(ch|sh|ss|x|z)es$/i, '$1'],
  [/([^s])s$/i, '$1']
];

// 不规则复数形式
const IRREGULAR_PLURALS: Record<string, string> = {
  child: 'children',
  person: 'people',
  man: 'men',
  woman: 'women',
  tooth: 'teeth',
  foot: 'feet',
  mouse: 'mice',
  goose: 'geese'
};

// 不规则单数形式
const IRREGULAR_SINGULARS: Record<string, string> = Object.entries(
  IRREGULAR_PLURALS
).reduce(
  (acc, [singular, plural]) => {
    acc[plural] = singular;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * 转换为复数形式
 * @param str 输入字符串
 * @returns 复数形式的字符串
 */
export function pluralize(str: string): string {
  if (!str) return str;

  // 检查不规则复数
  if (IRREGULAR_PLURALS[str.toLowerCase()]) {
    return IRREGULAR_PLURALS[str.toLowerCase()];
  }

  // 应用规则
  for (const [pattern, replacement] of PLURALIZATION_RULES) {
    if (pattern.test(str)) {
      return str.replace(pattern, replacement);
    }
  }

  return str;
}

/**
 * 转换为单数形式
 * @param str 输入字符串
 * @returns 单数形式的字符串
 */
export function singularize(str: string): string {
  if (!str) return str;

  // 检查不规则单数
  if (IRREGULAR_SINGULARS[str.toLowerCase()]) {
    return IRREGULAR_SINGULARS[str.toLowerCase()];
  }

  // 应用规则
  for (const [pattern, replacement] of SINGULARIZATION_RULES) {
    if (pattern.test(str)) {
      return str.replace(pattern, replacement);
    }
  }

  return str;
}
