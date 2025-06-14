/**
 * 单复数形式转换相关函数
 *
 * 本模块提供英文名词的单复数形式转换功能，支持常见的规则和不规则变化。
 *
 * @packageDocumentation
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
  goose: 'geese',
  ox: 'oxen',
  leaf: 'leaves',
  half: 'halves',
  knife: 'knives',
  life: 'lives',
  wife: 'wives',
  wolf: 'wolves'
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

// 不可数名词
const UNCOUNTABLE_NOUNS: string[] = [
  'equipment',
  'information',
  'rice',
  'money',
  'species',
  'series',
  'fish',
  'sheep',
  'deer',
  'aircraft',
  'software',
  'hardware',
  'feedback'
];

/**
 * 将英文名词转换为复数形式
 *
 * 处理常见的英文名词复数规则，包括规则变化和常见的不规则变化。
 *
 * @param str - 输入的单数形式名词
 * @returns 复数形式的名词
 * @remarks
 * 版本: 1.0.0
 * 分类: 单复数转换
 *
 * @example
 * ```typescript
 * pluralize('apple');    // 'apples'
 * pluralize('child');    // 'children'
 * pluralize('city');     // 'cities'
 * pluralize('box');      // 'boxes'
 * pluralize('fish');     // 'fish' (不可数)
 * ```
 * @public
 */
export function pluralize(str: string): string {
  if (!str) return str;

  // 统一转为小写处理
  const word = str.toLowerCase();

  // 检查不可数名词
  if (UNCOUNTABLE_NOUNS.includes(word)) {
    return str;
  }

  // 检查不规则复数
  if (IRREGULAR_PLURALS[word]) {
    // 保持原始大小写
    if (str[0] === str[0].toUpperCase()) {
      return (
        IRREGULAR_PLURALS[word].charAt(0).toUpperCase() +
        IRREGULAR_PLURALS[word].slice(1)
      );
    }
    return IRREGULAR_PLURALS[word];
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
 * 将英文名词转换为单数形式
 *
 * 处理常见的英文名词单数规则，包括规则变化和常见的不规则变化。
 *
 * @param str - 输入的复数形式名词
 * @returns 单数形式的名词
 * @remarks
 * 版本: 1.0.0
 * 分类: 单复数转换
 *
 * @example
 * ```typescript
 * singularize('apples');    // 'apple'
 * singularize('children');  // 'child'
 * singularize('cities');    // 'city'
 * singularize('boxes');     // 'box'
 * singularize('species');   // 'species' (不可数)
 * ```
 * @public
 */
export function singularize(str: string): string {
  if (!str) return str;

  // 统一转为小写处理
  const word = str.toLowerCase();

  // 检查不可数名词
  if (UNCOUNTABLE_NOUNS.includes(word)) {
    return str;
  }

  // 检查不规则单数
  if (IRREGULAR_SINGULARS[word]) {
    // 保持原始大小写
    if (str[0] === str[0].toUpperCase()) {
      return (
        IRREGULAR_SINGULARS[word].charAt(0).toUpperCase() +
        IRREGULAR_SINGULARS[word].slice(1)
      );
    }
    return IRREGULAR_SINGULARS[word];
  }

  // 应用规则
  for (const [pattern, replacement] of SINGULARIZATION_RULES) {
    if (pattern.test(str)) {
      return str.replace(pattern, replacement);
    }
  }

  return str;
}
