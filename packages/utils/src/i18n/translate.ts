/**
 * 国际化文本翻译相关函数
 */

import { getLocale } from './locale.js';

// 翻译存储
const translations: Record<string, Record<string, any>> = {};

/**
 * 获取对象中的嵌套属性
 * @param obj 对象
 * @param path 属性路径（使用点号分隔）
 * @param defaultValue 默认值
 * @returns 属性值或默认值
 */
function getNestedValue(
  obj: any,
  path: string,
  defaultValue: any = undefined
): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (
      current === undefined ||
      current === null ||
      !Object.prototype.hasOwnProperty.call(current, key)
    ) {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * 替换文本中的参数占位符
 * @param text 包含占位符的文本
 * @param params 参数对象
 * @returns 替换后的文本
 */
function replaceParams(text: string, params?: Record<string, any>): string {
  if (!params || !text.includes('{')) {
    return text;
  }

  return text.replace(/{([^}]+)}/g, (match, key) => {
    const value = params[key.trim()];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 加载翻译文件或对象到翻译系统
 * @param localeCode 区域设置编码
 * @param translationData 包含该区域设置翻译的对象
 */
export function loadTranslations(
  localeCode: string,
  translationData: Record<string, any>
): void {
  if (!translations[localeCode]) {
    translations[localeCode] = {};
  }

  translations[localeCode] = {
    ...translations[localeCode],
    ...translationData
  };
}

/**
 * 注册单个翻译键值对
 * @param locale 区域设置编码
 * @param key 翻译键
 * @param value 翻译值
 */
export function registerTranslation(
  locale: string,
  key: string,
  value: string
): void {
  if (!translations[locale]) {
    translations[locale] = {};
  }

  // 处理嵌套键
  const keys = key.split('.');
  let current = translations[locale];

  // 遍历到倒数第二层
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!current[k] || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }

  // 设置最后一层的值
  current[keys[keys.length - 1]] = value;
}

/**
 * 翻译文本消息
 * @param key 翻译键
 * @param params 用于替换消息中占位符的参数
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 翻译后的文本
 */
export function translate(
  key: string,
  params?: Record<string, any>,
  locale?: string
): string {
  const currentLocale = locale || getLocale();
  const localeTranslations = translations[currentLocale] || {};

  // 从翻译中获取文本
  const translatedText = getNestedValue(localeTranslations, key, key);

  // 如果是对象（复数形式）而不是字符串，返回键名
  if (typeof translatedText === 'object') {
    return key;
  }

  // 替换占位符
  return replaceParams(translatedText, params);
}

/**
 * 根据数量选择正确复数形式的翻译
 * @param key 翻译键
 * @param count 数量值，用于选择正确的复数形式
 * @param params 用于替换消息中占位符的参数
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 翻译后的文本
 */
export function translatePlural(
  key: string,
  count: number,
  params?: Record<string, any>,
  locale?: string
): string {
  const currentLocale = locale || getLocale();
  const localeTranslations = translations[currentLocale] || {};

  // 获取复数形式翻译对象
  const pluralForms = getNestedValue(localeTranslations, key, null);

  if (pluralForms && typeof pluralForms === 'object') {
    // 根据语言规则选择复数形式
    let form = 'other';

    // 简单的复数规则，可以根据需要扩展更复杂的规则
    if (count === 1) {
      form = 'one';
    } else if (count === 0) {
      form = 'zero';
    }

    // 获取对应的复数形式，如果不存在则使用"other"形式
    const translatedText = pluralForms[form] || pluralForms.other || key;

    // 合并count到参数中
    const mergedParams = { count, ...params };

    // 替换占位符
    return replaceParams(translatedText, mergedParams);
  }

  // 回退到常规翻译
  return translate(key, { count, ...params }, locale);
}

/**
 * 创建一个预设了命名空间的翻译器函数
 * @param namespace 翻译键的命名空间前缀
 * @returns 包含预设命名空间的翻译函数对象
 */
export function createTranslator(namespace: string): {
  t: (key: string, params?: Record<string, any>, locale?: string) => string;
  tp: (
    key: string,
    count: number,
    params?: Record<string, any>,
    locale?: string
  ) => string;
} {
  return {
    // 常规翻译
    t: (key: string, params?: Record<string, any>, locale?: string): string => {
      return translate(`${namespace}.${key}`, params, locale);
    },

    // 复数形式翻译
    tp: (
      key: string,
      count: number,
      params?: Record<string, any>,
      locale?: string
    ): string => {
      return translatePlural(`${namespace}.${key}`, count, params, locale);
    }
  };
}
