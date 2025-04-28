/**
 * 国际化工具函数模块
 * 提供国际化相关的工具函数
 */

// 导出格式化相关函数
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatTime,
  formatUnit,
  type CurrencyFormatOptions,
  type DateFormatOptions,
  type DateTimeFormatOptions,
  type NumberFormatOptions,
  type PercentFormatOptions,
  type RelativeTimeFormatOptions,
  type TimeFormatOptions,
  type UnitFormatOptions
} from './format.js';

// 导出语言和区域设置相关函数
export {
  addSupportedLocale,
  detectLocale,
  getLocale,
  getSupportedLocales,
  isRTL,
  setLocale
} from './locale.js';

// 导出翻译相关函数
export {
  createTranslator,
  loadTranslations,
  registerTranslation,
  translate,
  translatePlural
} from './translate.js';
