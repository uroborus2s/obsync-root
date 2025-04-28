/**
 * 时间相关工具函数
 * 基于date-fns 4.1.0实现
 */

// 从date-fns导入需要的函数
import {
  addDays as dateFnsAddDays,
  addMonths as dateFnsAddMonths,
  addYears as dateFnsAddYears,
  differenceInDays as dateFnsDifferenceInDays,
  differenceInMonths as dateFnsDifferenceInMonths,
  differenceInYears as dateFnsDifferenceInYears,
  endOfDay as dateFnsEndOfDay,
  endOfMonth as dateFnsEndOfMonth,
  endOfYear as dateFnsEndOfYear,
  format as dateFnsFormat,
  formatDuration as dateFnsFormatDuration,
  isAfter as dateFnsIsAfter,
  isBefore as dateFnsIsBefore,
  isSameDay as dateFnsIsSameDay,
  isSameMonth as dateFnsIsSameMonth,
  isSameYear as dateFnsIsSameYear,
  isValid as dateFnsIsValid,
  parse as dateFnsParse,
  startOfDay as dateFnsStartOfDay,
  startOfMonth as dateFnsStartOfMonth,
  startOfYear as dateFnsStartOfYear,
  formatDistance
} from 'date-fns';

import type { Duration } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';

// 格式化选项接口
export interface FormatOptions {
  locale?: 'zh-CN' | 'en-US' | 'en' | 'ja' | 'ja-JP';
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

// 解析选项接口
export interface ParseOptions {
  locale?: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

// 相对时间选项接口
export interface RelativeTimeOptions {
  locale?: string;
  now?: Date | number | string;
}

// 持续时间格式化选项接口
export interface FormatDurationOptions {
  format?: Array<keyof Duration>;
  delimiter?: string;
  locale?: string;
  zero?: boolean;
}

/**
 * 获取locale对象
 * @private
 */
function getLocale(locale?: string) {
  switch (locale) {
    case 'zh-CN':
      return zhCN;
    case 'en':
    case 'en-US':
      return enUS;
    default:
      return zhCN; // 默认使用中文
  }
}

/**
 * 确保输入是Date对象
 * @private
 */
function ensureDate(date: Date | number | string): Date {
  return date instanceof Date ? date : new Date(date);
}

/**
 * 将日期格式化为字符串
 */
export function format(
  date: Date | number | string,
  formatStr: string,
  options: FormatOptions = {}
): string {
  const locale = getLocale(options.locale);
  const dateObj = ensureDate(date);

  return dateFnsFormat(dateObj, formatStr, {
    locale,
    weekStartsOn: options.weekStartsOn
  });
}

/**
 * 将字符串解析为日期对象
 */
export function parse(
  dateStr: string,
  formatStr: string,
  referenceDate: Date = new Date(),
  options: ParseOptions = {}
): Date {
  const locale = getLocale(options.locale);

  return dateFnsParse(dateStr, formatStr, referenceDate, {
    locale,
    weekStartsOn: options.weekStartsOn
  });
}

/**
 * 获取当前时间的时间戳
 */
export function now(): number {
  return Date.now();
}

/**
 * 检查给定值是否为有效的日期
 */
export function isValid(date: any): boolean {
  if (date instanceof Date) {
    return dateFnsIsValid(date);
  }

  try {
    const d = new Date(date);
    return dateFnsIsValid(d);
  } catch (e) {
    return false;
  }
}

/**
 * 检查第一个日期是否晚于第二个日期
 */
export function isAfter(
  date: Date | number | string,
  dateToCompare: Date | number | string
): boolean {
  const d1 = ensureDate(date);
  const d2 = ensureDate(dateToCompare);
  return dateFnsIsAfter(d1, d2);
}

/**
 * 检查第一个日期是否早于第二个日期
 */
export function isBefore(
  date: Date | number | string,
  dateToCompare: Date | number | string
): boolean {
  const d1 = ensureDate(date);
  const d2 = ensureDate(dateToCompare);
  return dateFnsIsBefore(d1, d2);
}

/**
 * 检查两个日期是否为同一天
 */
export function isSameDay(
  dateLeft: Date | number | string,
  dateRight: Date | number | string
): boolean {
  const d1 = ensureDate(dateLeft);
  const d2 = ensureDate(dateRight);
  return dateFnsIsSameDay(d1, d2);
}

/**
 * 检查两个日期是否在同一个月
 */
export function isSameMonth(
  dateLeft: Date | number | string,
  dateRight: Date | number | string
): boolean {
  const d1 = ensureDate(dateLeft);
  const d2 = ensureDate(dateRight);
  return dateFnsIsSameMonth(d1, d2);
}

/**
 * 检查两个日期是否在同一年
 */
export function isSameYear(
  dateLeft: Date | number | string,
  dateRight: Date | number | string
): boolean {
  const d1 = ensureDate(dateLeft);
  const d2 = ensureDate(dateRight);
  return dateFnsIsSameYear(d1, d2);
}

/**
 * 添加指定天数到日期
 */
export function addDays(date: Date | number | string, amount: number): Date {
  const d = ensureDate(date);
  return dateFnsAddDays(d, amount);
}

/**
 * 添加指定月数到日期
 */
export function addMonths(date: Date | number | string, amount: number): Date {
  const d = ensureDate(date);
  return dateFnsAddMonths(d, amount);
}

/**
 * 添加指定年数到日期
 */
export function addYears(date: Date | number | string, amount: number): Date {
  const d = ensureDate(date);
  return dateFnsAddYears(d, amount);
}

/**
 * 计算两个日期之间的天数差异
 */
export function differenceInDays(
  dateLeft: Date | number | string,
  dateRight: Date | number | string
): number {
  const d1 = ensureDate(dateLeft);
  const d2 = ensureDate(dateRight);
  return dateFnsDifferenceInDays(d1, d2);
}

/**
 * 计算两个日期之间的月数差异
 */
export function differenceInMonths(
  dateLeft: Date | number | string,
  dateRight: Date | number | string
): number {
  const d1 = ensureDate(dateLeft);
  const d2 = ensureDate(dateRight);
  return dateFnsDifferenceInMonths(d1, d2);
}

/**
 * 计算两个日期之间的年数差异
 */
export function differenceInYears(
  dateLeft: Date | number | string,
  dateRight: Date | number | string
): number {
  const d1 = ensureDate(dateLeft);
  const d2 = ensureDate(dateRight);
  return dateFnsDifferenceInYears(d1, d2);
}

/**
 * 返回给定日期的当天开始时刻
 */
export function startOfDay(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsStartOfDay(d);
}

/**
 * 返回给定日期的当天结束时刻
 */
export function endOfDay(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsEndOfDay(d);
}

/**
 * 返回给定日期的当月开始日期
 */
export function startOfMonth(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsStartOfMonth(d);
}

/**
 * 返回给定日期的当月结束日期
 */
export function endOfMonth(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsEndOfMonth(d);
}

/**
 * 返回给定日期的当年开始日期
 */
export function startOfYear(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsStartOfYear(d);
}

/**
 * 返回给定日期的当年结束日期
 */
export function endOfYear(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsEndOfYear(d);
}

/**
 * 获取相对于当前时间的相对时间描述
 */
export function getRelativeTime(
  date: Date | number | string,
  options: RelativeTimeOptions = {}
): string {
  const d = ensureDate(date);
  const now = options.now ? ensureDate(options.now) : new Date();
  const locale = getLocale(options.locale);

  // 使用date-fns的formatDistance获取相对时间描述
  const baseResult = formatDistance(d, now, {
    locale,
    addSuffix: true // 自动添加前缀或后缀
  });

  return baseResult;
}

/**
 * 将持续时间（毫秒）格式化为人类可读的字符串
 */
export function formatDuration(
  durationMs: number,
  options: FormatDurationOptions = {}
): string {
  // 将毫秒转换为Duration对象
  const duration: Duration = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  };

  // 计算各单位的值
  let ms = Math.abs(durationMs);

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  // 从最大单位开始计算
  if (ms >= YEAR) {
    duration.years = Math.floor(ms / YEAR);
    ms %= YEAR;
  }

  if (ms >= MONTH) {
    duration.months = Math.floor(ms / MONTH);
    ms %= MONTH;
  }

  if (ms >= WEEK) {
    duration.weeks = Math.floor(ms / WEEK);
    ms %= WEEK;
  }

  if (ms >= DAY) {
    duration.days = Math.floor(ms / DAY);
    ms %= DAY;
  }

  if (ms >= HOUR) {
    duration.hours = Math.floor(ms / HOUR);
    ms %= HOUR;
  }

  if (ms >= MINUTE) {
    duration.minutes = Math.floor(ms / MINUTE);
    ms %= MINUTE;
  }

  if (ms >= SECOND) {
    duration.seconds = Math.floor(ms / SECOND);
  }

  // 获取locale对象并应用格式化
  const locale = getLocale(options.locale);

  return dateFnsFormatDuration(duration, {
    format: options.format || [
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
      'seconds'
    ],
    delimiter: options.delimiter || ', ',
    locale,
    zero: options.zero || false
  });
}
