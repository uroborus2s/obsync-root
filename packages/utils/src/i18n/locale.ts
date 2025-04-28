/**
 * 语言和区域设置相关函数
 */

// RTL语言列表
const RTL_LOCALES = [
  'ar', // 阿拉伯语
  'arc', // 阿拉米语
  'dv', // 迪维希语
  'fa', // 波斯语
  'ha', // 豪萨语
  'he', // 希伯来语
  'khw', // 科瓦尔语
  'ks', // 克什米尔语
  'ku', // 库尔德语
  'ps', // 普什图语
  'ur', // 乌尔都语
  'yi' // 意第绪语
];

// 默认支持的区域设置
const DEFAULT_SUPPORTED_LOCALES = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' }
];

// 当前区域设置
let currentLocale = 'zh-CN';
// 当前支持的区域设置
let supportedLocales = [...DEFAULT_SUPPORTED_LOCALES];

/**
 * 获取当前使用的区域设置
 * @returns 当前区域设置编码
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * 设置当前区域设置
 * @param locale 要设置的区域设置编码
 * @returns 设置是否成功
 */
export function setLocale(locale: string): boolean {
  // 验证区域设置是否支持
  const isSupported = supportedLocales.some((item) => item.code === locale);

  if (isSupported) {
    currentLocale = locale;
    return true;
  }

  return false;
}

/**
 * 获取支持的所有区域设置列表
 * @returns 支持的区域设置对象数组
 */
export function getSupportedLocales(): Array<{ code: string; name: string }> {
  return [...supportedLocales];
}

/**
 * 添加支持的区域设置
 * @param locale 区域设置对象或对象数组
 */
export function addSupportedLocale(
  locale: { code: string; name: string } | Array<{ code: string; name: string }>
): void {
  if (Array.isArray(locale)) {
    supportedLocales = [...supportedLocales, ...locale];
  } else {
    supportedLocales.push(locale);
  }
}

/**
 * 自动检测用户的首选区域设置
 * @param fallback 如果无法检测到区域设置时的回退设置
 * @returns 检测到的区域设置编码
 */
export function detectLocale(fallback = 'en-US'): string {
  // 在浏览器环境中
  if (typeof window !== 'undefined' && window.navigator) {
    const userLanguages = [
      window.navigator.language,
      ...(window.navigator.languages || [])
    ];

    // 尝试匹配支持的区域设置
    for (const lang of userLanguages) {
      const supportedLocale = supportedLocales.find(
        (locale) =>
          locale.code === lang ||
          locale.code.split('-')[0] === lang.split('-')[0]
      );

      if (supportedLocale) {
        return supportedLocale.code;
      }
    }
  }

  // 在Node.js环境中
  if (typeof process !== 'undefined' && process.env.LANG) {
    const nodeLang = process.env.LANG.split('.')[0].replace('_', '-');
    const supportedLocale = supportedLocales.find(
      (locale) =>
        locale.code === nodeLang ||
        locale.code.split('-')[0] === nodeLang.split('-')[0]
    );

    if (supportedLocale) {
      return supportedLocale.code;
    }
  }

  // 使用回退区域设置
  return fallback;
}

/**
 * 检查指定区域设置是否为从右到左(RTL)书写方式
 * @param locale 要检查的区域设置，不指定则使用当前区域设置
 * @returns 如果是RTL书写方向则返回true，否则返回false
 */
export function isRTL(locale?: string): boolean {
  const localeToCheck = locale || currentLocale;
  const langCode = localeToCheck.split('-')[0].toLowerCase();

  return RTL_LOCALES.includes(langCode);
}
