/**
 * 国际化格式化相关函数
 */

import { getLocale } from './locale.js';

/**
 * 日期格式化选项
 */
export interface DateFormatOptions
  extends Omit<Intl.DateTimeFormatOptions, 'format'> {
  format?: 'short' | 'medium' | 'long' | 'full' | string;
}

/**
 * 时间格式化选项
 */
export interface TimeFormatOptions
  extends Omit<Intl.DateTimeFormatOptions, 'format'> {
  format?: 'short' | 'medium' | 'long' | 'full' | string;
  hour12?: boolean;
}

/**
 * 日期时间格式化选项
 */
export interface DateTimeFormatOptions
  extends Omit<Intl.DateTimeFormatOptions, 'format'> {
  format?: 'short' | 'medium' | 'long' | 'full' | string;
  dateStyle?: 'short' | 'medium' | 'long' | 'full';
  timeStyle?: 'short' | 'medium' | 'long' | 'full';
}

/**
 * 相对时间格式化选项
 */
export interface RelativeTimeFormatOptions {
  now?: Date;
  style?: 'long' | 'short' | 'narrow';
  numeric?: 'always' | 'auto';
}

/**
 * 数字格式化选项
 */
export interface NumberFormatOptions
  extends Omit<Intl.NumberFormatOptions, 'precision'> {
  precision?: number;
  useGrouping?: boolean;
}

/**
 * 货币格式化选项
 */
export interface CurrencyFormatOptions
  extends Omit<Intl.NumberFormatOptions, 'precision' | 'display'> {
  precision?: number;
  display?: 'symbol' | 'code' | 'name';
}

/**
 * 百分比格式化选项
 */
export interface PercentFormatOptions
  extends Omit<Intl.NumberFormatOptions, 'precision'> {
  precision?: number;
}

/**
 * 单位格式化选项
 */
export interface UnitFormatOptions
  extends Omit<Intl.NumberFormatOptions, 'precision'> {
  precision?: number;
  unitDisplay?: 'short' | 'long' | 'narrow';
}

// 预设格式定义
const DATE_PRESETS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
};

const TIME_PRESETS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { hour: 'numeric', minute: 'numeric' },
  medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
  long: {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short'
  },
  full: {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'long'
  }
};

const DATETIME_PRESETS: Record<string, Intl.DateTimeFormatOptions> = {
  short: { ...DATE_PRESETS.short, ...TIME_PRESETS.short },
  medium: { ...DATE_PRESETS.medium, ...TIME_PRESETS.medium },
  long: { ...DATE_PRESETS.long, ...TIME_PRESETS.long },
  full: { ...DATE_PRESETS.full, ...TIME_PRESETS.full }
};

/**
 * 规范化日期对象
 * @param date 日期（Date对象、时间戳或ISO日期字符串）
 * @returns Date对象
 */
function normalizeDate(date: Date | number | string): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

/**
 * 格式化日期
 * @param date 要格式化的日期（Date对象、时间戳或ISO日期字符串）
 * @param options 格式化选项
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: Date | number | string,
  options: DateFormatOptions = {},
  locale?: string
): string {
  const currentLocale = locale || getLocale();
  const normalizedDate = normalizeDate(date);

  // 处理预设格式
  let formatOptions: Intl.DateTimeFormatOptions = { ...options };
  if (options.format && DATE_PRESETS[options.format]) {
    formatOptions = { ...DATE_PRESETS[options.format], ...formatOptions };
    delete (formatOptions as DateFormatOptions).format;
  }

  // 创建格式化器
  const formatter = new Intl.DateTimeFormat(currentLocale, formatOptions);

  // 返回格式化后的字符串
  return formatter.format(normalizedDate);
}

/**
 * 格式化时间
 * @param time 要格式化的时间（Date对象、时间戳或ISO日期字符串）
 * @param options 格式化选项
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 格式化后的时间字符串
 */
export function formatTime(
  time: Date | number | string,
  options: TimeFormatOptions = {},
  locale?: string
): string {
  const currentLocale = locale || getLocale();
  const normalizedTime = normalizeDate(time);

  // 处理预设格式
  let formatOptions: Intl.DateTimeFormatOptions = { ...options };
  if (options.format && TIME_PRESETS[options.format]) {
    formatOptions = { ...TIME_PRESETS[options.format], ...formatOptions };
    delete (formatOptions as TimeFormatOptions).format;
  }

  // 创建格式化器
  const formatter = new Intl.DateTimeFormat(currentLocale, formatOptions);

  // 返回格式化后的字符串
  return formatter.format(normalizedTime);
}

/**
 * 格式化日期和时间
 * @param dateTime 要格式化的日期和时间（Date对象、时间戳或ISO日期字符串）
 * @param options 格式化选项
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 格式化后的日期和时间字符串
 */
export function formatDateTime(
  dateTime: Date | number | string,
  options: DateTimeFormatOptions = {},
  locale?: string
): string {
  const currentLocale = locale || getLocale();
  const normalizedDateTime = normalizeDate(dateTime);

  // 处理预设格式
  let formatOptions: Intl.DateTimeFormatOptions = { ...options };
  if (options.format && DATETIME_PRESETS[options.format]) {
    formatOptions = { ...DATETIME_PRESETS[options.format], ...formatOptions };
    delete (formatOptions as DateTimeFormatOptions).format;
  }

  // 创建格式化器
  const formatter = new Intl.DateTimeFormat(currentLocale, formatOptions);

  // 返回格式化后的字符串
  return formatter.format(normalizedDateTime);
}

/**
 * 计算相对时间单位
 * @param date 日期
 * @param now 参考日期
 * @returns 相对时间单位和值
 */
function getRelativeTimeUnit(
  date: Date,
  now: Date
): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  if (Math.abs(diffSec) < 60) {
    return { value: diffSec, unit: 'second' };
  } else if (Math.abs(diffMin) < 60) {
    return { value: diffMin, unit: 'minute' };
  } else if (Math.abs(diffHour) < 24) {
    return { value: diffHour, unit: 'hour' };
  } else if (Math.abs(diffDay) < 7) {
    return { value: diffDay, unit: 'day' };
  } else if (Math.abs(diffWeek) < 4) {
    return { value: diffWeek, unit: 'week' };
  } else if (Math.abs(diffMonth) < 12) {
    return { value: diffMonth, unit: 'month' };
  } else {
    return { value: diffYear, unit: 'year' };
  }
}

/**
 * 格式化相对时间
 * @param date 要相对于当前时间格式化的日期
 * @param options 格式化选项
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 格式化后的相对时间字符串
 */
export function formatRelativeTime(
  date: Date | number | string,
  options: RelativeTimeFormatOptions = {},
  locale?: string
): string {
  const currentLocale = locale || getLocale();
  const normalizedDate = normalizeDate(date);
  const now = options.now || new Date();
  const style = options.style || 'long';
  const numeric = options.numeric || 'always';

  // 获取相对时间单位
  const { value, unit } = getRelativeTimeUnit(normalizedDate, now);

  // 创建相对时间格式化器
  const formatter = new Intl.RelativeTimeFormat(currentLocale, {
    style,
    numeric
  });

  // 返回格式化后的相对时间字符串
  return formatter.format(value, unit);
}

/**
 * 格式化数字
 * @param value 要格式化的数字
 * @param options 格式化选项
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 格式化后的数字字符串
 */
export function formatNumber(
  value: number,
  options: NumberFormatOptions = {},
  locale?: string
): string {
  const currentLocale = locale || getLocale();

  // 处理选项
  const formatOptions: Intl.NumberFormatOptions = { ...options };

  // 处理精度
  if (options.precision !== undefined) {
    formatOptions.minimumFractionDigits = options.precision;
    formatOptions.maximumFractionDigits = options.precision;
    delete (formatOptions as NumberFormatOptions).precision;
  }

  // 创建格式化器
  const formatter = new Intl.NumberFormat(currentLocale, formatOptions);

  // 返回格式化后的字符串
  return formatter.format(value);
}

/**
 * 格式化货币
 * @param value 要格式化的金额
 * @param currency 货币代码（ISO 4217格式，如 'CNY', 'USD', 'EUR'）
 * @param options 格式化选项
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(
  value: number,
  currency: string,
  options: CurrencyFormatOptions = {},
  locale?: string
): string {
  const currentLocale = locale || getLocale();

  // 处理选项
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    ...options
  };

  // 处理显示方式
  if (options.display) {
    formatOptions.currencyDisplay = options.display;
    delete (formatOptions as CurrencyFormatOptions).display;
  }

  // 处理精度
  if (options.precision !== undefined) {
    formatOptions.minimumFractionDigits = options.precision;
    formatOptions.maximumFractionDigits = options.precision;
    delete (formatOptions as CurrencyFormatOptions).precision;
  }

  // 创建格式化器
  const formatter = new Intl.NumberFormat(currentLocale, formatOptions);

  // 返回格式化后的字符串
  return formatter.format(value);
}

/**
 * 格式化百分比
 * @param value 要格式化的数字（1.0 = 100%）
 * @param options 格式化选项
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(
  value: number,
  options: PercentFormatOptions = {},
  locale?: string
): string {
  const currentLocale = locale || getLocale();

  // 处理选项
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    ...options
  };

  // 处理精度
  if (options.precision !== undefined) {
    formatOptions.minimumFractionDigits = options.precision;
    formatOptions.maximumFractionDigits = options.precision;
    delete (formatOptions as PercentFormatOptions).precision;
  }

  // 创建格式化器
  const formatter = new Intl.NumberFormat(currentLocale, formatOptions);

  // 返回格式化后的字符串
  return formatter.format(value);
}

/**
 * 格式化带有单位的数字
 * @param value 要格式化的数字
 * @param unit 单位标识符，如 'meter', 'kilogram', 'celsius'
 * @param options 格式化选项
 * @param locale 使用的区域设置，默认使用当前区域设置
 * @returns 格式化后的带单位的字符串
 */
export function formatUnit(
  value: number,
  unit: string,
  options: UnitFormatOptions = {},
  locale?: string
): string {
  const currentLocale = locale || getLocale();

  // 处理选项
  const formatOptions: Intl.NumberFormatOptions = {
    style: 'unit',
    unit,
    ...options
  };

  // 处理精度
  if (options.precision !== undefined) {
    formatOptions.minimumFractionDigits = options.precision;
    formatOptions.maximumFractionDigits = options.precision;
    delete (formatOptions as UnitFormatOptions).precision;
  }

  // 创建格式化器
  const formatter = new Intl.NumberFormat(currentLocale, formatOptions);

  // 返回格式化后的字符串
  return formatter.format(value);
}
