/**
 * 时间相关工具函数
 *
 * 基于date-fns 4.1.0实现的日期和时间操作工具集，包括时间格式化、解析、
 * 日期计算、比较等功能。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 时间处理
 *
 * @packageDocumentation
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

/**
 * 格式化选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface FormatOptions {
  /**
   * 地区设置
   * @defaultValue 'zh-CN'
   */
  locale?: 'zh-CN' | 'en-US' | 'en' | 'ja' | 'ja-JP';

  /**
   * 每周的第一天（0表示周日，1表示周一，以此类推）
   * @defaultValue 0
   */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * 解析选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface ParseOptions {
  /**
   * 地区设置
   * @defaultValue 'zh-CN'
   */
  locale?: string;

  /**
   * 每周的第一天（0表示周日，1表示周一，以此类推）
   * @defaultValue 0
   */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * 相对时间选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface RelativeTimeOptions {
  /**
   * 地区设置
   * @defaultValue 'zh-CN'
   */
  locale?: string;

  /**
   * 参考时间点
   * @defaultValue 当前时间
   */
  now?: Date | number | string;
}

/**
 * 持续时间格式化选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface FormatDurationOptions {
  /**
   * 要包含的时间单位
   * @defaultValue ['years', 'months', 'days', 'hours', 'minutes', 'seconds']
   */
  format?: Array<keyof Duration>;

  /**
   * 时间单位间的分隔符
   * @defaultValue ' '
   */
  delimiter?: string;

  /**
   * 地区设置
   * @defaultValue 'zh-CN'
   */
  locale?: string;

  /**
   * 是否显示为零的单位
   * @defaultValue false
   */
  zero?: boolean;
}

/**
 * 获取locale对象
 *
 * @param locale - 地区字符串
 * @returns 对应的locale对象
 * @internal
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
 *
 * @param date - 日期输入，可以是Date对象、时间戳或日期字符串
 * @returns Date对象
 * @throws `TypeError` 如果输入无法转换为有效的Date对象
 * @internal
 */
function ensureDate(date: Date | number | string): Date {
  return date instanceof Date ? date : new Date(date);
}

/**
 * 将日期格式化为字符串
 *
 * @param date - 要格式化的日期
 * @param formatStr - 格式化字符串，参考date-fns的format格式
 * @param options - 格式化选项
 * @returns 格式化后的日期字符串
 * @throws `TypeError` 如果日期无效或无法解析
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期格式化
 *
 * @example
 * ```typescript
 * format(new Date(2021, 0, 1), 'yyyy-MM-dd');  // '2021-01-01'
 * format('2021-01-01', 'yyyy年MM月dd日', { locale: 'zh-CN' });  // '2021年01月01日'
 * format(1609459200000, 'MMM do, yyyy', { locale: 'en-US' });  // 'Jan 1st, 2021'
 * ```
 * @public
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
 *
 * @param dateStr - 要解析的日期字符串
 * @param formatStr - 日期字符串的格式
 * @param referenceDate - 参考日期
 * @param options - 解析选项
 * @returns 解析后的Date对象
 * @throws `TypeError` 如果日期字符串无法按照指定格式解析
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期解析
 *
 * @example
 * ```typescript
 * parse('2021-01-01', 'yyyy-MM-dd');  // new Date(2021, 0, 1)
 * parse('2021年01月01日', 'yyyy年MM月dd日', new Date(), { locale: 'zh-CN' });
 * ```
 * @public
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
 *
 * @returns 当前时间的毫秒时间戳
 * @remarks
 * 版本: 1.0.0
 * 分类: 时间获取
 *
 * @example
 * ```typescript
 * const timestamp = now();  // 例如：1609459200000
 * ```
 * @public
 */
export function now(): number {
  return Date.now();
}

/**
 * 检查给定值是否为有效的日期
 *
 * @param date - 要检查的日期值
 * @returns 如果是有效日期返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期验证
 *
 * @example
 * ```typescript
 * isValid(new Date());  // true
 * isValid(new Date('invalid-date'));  // false
 * isValid('2021-01-01');  // true
 * isValid('not-a-date');  // false
 * ```
 * @public
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
 *
 * @param date - 要比较的日期
 * @param dateToCompare - 被比较的日期
 * @returns 如果第一个日期晚于第二个日期，返回true，否则返回false
 * @throws `TypeError` 如果任一参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期比较
 *
 * @example
 * ```typescript
 * isAfter(new Date(2021, 0, 2), new Date(2021, 0, 1));  // true
 * isAfter('2021-01-02', '2021-01-01');  // true
 * isAfter(new Date(2021, 0, 1), new Date(2021, 0, 1));  // false
 * ```
 * @public
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
 *
 * @param date - 要比较的日期
 * @param dateToCompare - 被比较的日期
 * @returns 如果第一个日期早于第二个日期，返回true，否则返回false
 * @throws `TypeError` 如果任一参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期比较
 *
 * @example
 * ```typescript
 * isBefore(new Date(2021, 0, 1), new Date(2021, 0, 2));  // true
 * isBefore('2021-01-01', '2021-01-02');  // true
 * isBefore(new Date(2021, 0, 1), new Date(2021, 0, 1));  // false
 * ```
 * @public
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
 *
 * @param dateLeft - 第一个日期
 * @param dateRight - 第二个日期
 * @returns 如果两个日期是同一天，返回true，否则返回false
 * @throws `TypeError` 如果任一参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期比较
 *
 * @example
 * ```typescript
 * isSameDay(new Date(2021, 0, 1, 12), new Date(2021, 0, 1, 15));  // true
 * isSameDay(new Date(2021, 0, 1), new Date(2021, 0, 2));  // false
 * ```
 * @public
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
 *
 * @param dateLeft - 第一个日期
 * @param dateRight - 第二个日期
 * @returns 如果两个日期在同一个月，返回true，否则返回false
 * @throws `TypeError` 如果任一参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期比较
 *
 * @example
 * ```typescript
 * isSameMonth(new Date(2021, 0, 1), new Date(2021, 0, 15));  // true
 * isSameMonth(new Date(2021, 0, 1), new Date(2021, 1, 1));  // false
 * ```
 * @public
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
 *
 * @param dateLeft - 第一个日期
 * @param dateRight - 第二个日期
 * @returns 如果两个日期在同一年，返回true，否则返回false
 * @throws `TypeError` 如果任一参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期比较
 *
 * @example
 * ```typescript
 * isSameYear(new Date(2021, 0, 1), new Date(2021, 11, 31));  // true
 * isSameYear(new Date(2021, 0, 1), new Date(2022, 0, 1));  // false
 * ```
 * @public
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
 * 在日期上增加指定天数
 *
 * @param date - 基准日期
 * @param amount - 要增加的天数
 * @returns 增加天数后的新日期
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期计算
 *
 * @example
 * ```typescript
 * addDays(new Date(2021, 0, 1), 5);  // new Date(2021, 0, 6)
 * addDays(new Date(2021, 0, 31), 1);  // new Date(2021, 1, 1)
 * ```
 * @public
 */
export function addDays(date: Date | number | string, amount: number): Date {
  const d = ensureDate(date);
  return dateFnsAddDays(d, amount);
}

/**
 * 在日期上增加指定月数
 *
 * @param date - 基准日期
 * @param amount - 要增加的月数
 * @returns 增加月数后的新日期
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期计算
 *
 * @example
 * ```typescript
 * addMonths(new Date(2021, 0, 1), 1);  // new Date(2021, 1, 1)
 * addMonths(new Date(2021, 0, 31), 1);  // new Date(2021, 1, 28)
 * ```
 * @public
 */
export function addMonths(date: Date | number | string, amount: number): Date {
  const d = ensureDate(date);
  return dateFnsAddMonths(d, amount);
}

/**
 * 在日期上增加指定年数
 *
 * @param date - 基准日期
 * @param amount - 要增加的年数
 * @returns 增加年数后的新日期
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期计算
 *
 * @example
 * ```typescript
 * addYears(new Date(2021, 0, 1), 1);  // new Date(2022, 0, 1)
 * addYears(new Date(2020, 1, 29), 1);  // new Date(2021, 1, 28)
 * ```
 * @public
 */
export function addYears(date: Date | number | string, amount: number): Date {
  const d = ensureDate(date);
  return dateFnsAddYears(d, amount);
}

/**
 * 计算两个日期之间相差的天数
 *
 * @param dateLeft - 第一个日期
 * @param dateRight - 第二个日期
 * @returns 两个日期之间的天数差（正数表示第一个日期晚于第二个日期）
 * @throws `TypeError` 如果任一参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期计算
 *
 * @example
 * ```typescript
 * differenceInDays(new Date(2021, 0, 10), new Date(2021, 0, 1));  // 9
 * differenceInDays(new Date(2021, 0, 1), new Date(2021, 0, 10));  // -9
 * ```
 * @public
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
 * 计算两个日期之间相差的月数
 *
 * @param dateLeft - 第一个日期
 * @param dateRight - 第二个日期
 * @returns 两个日期之间的月数差（正数表示第一个日期晚于第二个日期）
 * @throws `TypeError` 如果任一参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期计算
 *
 * @example
 * ```typescript
 * differenceInMonths(new Date(2021, 3, 1), new Date(2021, 0, 1));  // 3
 * differenceInMonths(new Date(2021, 0, 1), new Date(2021, 3, 1));  // -3
 * ```
 * @public
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
 * 计算两个日期之间相差的年数
 *
 * @param dateLeft - 第一个日期
 * @param dateRight - 第二个日期
 * @returns 两个日期之间的年数差（正数表示第一个日期晚于第二个日期）
 * @throws `TypeError` 如果任一参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期计算
 *
 * @example
 * ```typescript
 * differenceInYears(new Date(2022, 0, 1), new Date(2021, 0, 1));  // 1
 * differenceInYears(new Date(2021, 0, 1), new Date(2022, 0, 1));  // -1
 * ```
 * @public
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
 * 获取一天的开始时间
 *
 * @param date - 日期
 * @returns 该日期当天的开始时间 (00:00:00.000)
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期边界
 *
 * @example
 * ```typescript
 * startOfDay(new Date(2021, 0, 1, 12, 30));  // new Date(2021, 0, 1, 0, 0, 0, 0)
 * ```
 * @public
 */
export function startOfDay(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsStartOfDay(d);
}

/**
 * 获取一天的结束时间
 *
 * @param date - 日期
 * @returns 该日期当天的结束时间 (23:59:59.999)
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期边界
 *
 * @example
 * ```typescript
 * endOfDay(new Date(2021, 0, 1, 12, 30));  // new Date(2021, 0, 1, 23, 59, 59, 999)
 * ```
 * @public
 */
export function endOfDay(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsEndOfDay(d);
}

/**
 * 获取一个月的开始时间
 *
 * @param date - 日期
 * @returns 该日期所在月的第一天的开始时间 (1号 00:00:00.000)
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期边界
 *
 * @example
 * ```typescript
 * startOfMonth(new Date(2021, 0, 15));  // new Date(2021, 0, 1, 0, 0, 0, 0)
 * ```
 * @public
 */
export function startOfMonth(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsStartOfMonth(d);
}

/**
 * 获取一个月的结束时间
 *
 * @param date - 日期
 * @returns 该日期所在月的最后一天的结束时间 (23:59:59.999)
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期边界
 *
 * @example
 * ```typescript
 * endOfMonth(new Date(2021, 0, 15));  // new Date(2021, 0, 31, 23, 59, 59, 999)
 * ```
 * @public
 */
export function endOfMonth(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsEndOfMonth(d);
}

/**
 * 获取一年的开始时间
 *
 * @param date - 日期
 * @returns 该日期所在年的第一天的开始时间 (1月1日 00:00:00.000)
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期边界
 *
 * @example
 * ```typescript
 * startOfYear(new Date(2021, 5, 15));  // new Date(2021, 0, 1, 0, 0, 0, 0)
 * ```
 * @public
 */
export function startOfYear(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsStartOfYear(d);
}

/**
 * 获取一年的结束时间
 *
 * @param date - 日期
 * @returns 该日期所在年的最后一天的结束时间 (12月31日 23:59:59.999)
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期边界
 *
 * @example
 * ```typescript
 * endOfYear(new Date(2021, 5, 15));  // new Date(2021, 11, 31, 23, 59, 59, 999)
 * ```
 * @public
 */
export function endOfYear(date: Date | number | string): Date {
  const d = ensureDate(date);
  return dateFnsEndOfYear(d);
}

/**
 * 获取相对于当前时间或指定时间的人性化描述
 *
 * @param date - 要描述的日期
 * @param options - 相对时间选项
 * @returns 人性化时间描述字符串
 * @throws `TypeError` 如果日期参数无法转换为有效的Date对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期描述
 *
 * @example
 * ```typescript
 * // 假设当前时间是2021-01-01 12:00:00
 * getRelativeTime(new Date(2021, 0, 1, 11, 30));  // '30分钟前'
 * getRelativeTime(new Date(2020, 11, 31));  // '昨天'
 * getRelativeTime(new Date(2020, 0, 1));  // '1年前'
 *
 * // 使用自定义参考时间
 * getRelativeTime(new Date(2021, 0, 1), { now: new Date(2021, 0, 2) });  // '昨天'
 * ```
 * @public
 */
export function getRelativeTime(
  date: Date | number | string,
  options: RelativeTimeOptions = {}
): string {
  const d = ensureDate(date);
  const now = options.now ? ensureDate(options.now) : new Date();
  const locale = getLocale(options.locale);

  return formatDistance(d, now, {
    addSuffix: true,
    locale
  });
}

/**
 * 将毫秒时间格式化为持续时间字符串
 *
 * @param durationMs - 持续时间（毫秒）
 * @param options - 格式化选项
 * @returns 格式化后的持续时间字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 持续时间
 *
 * @example
 * ```typescript
 * formatDuration(3662000);  // '1小时 1分钟 2秒'
 * formatDuration(3662000, { format: ['hours', 'minutes'] });  // '1小时 1分钟'
 * formatDuration(3662000, { delimiter: ', ' });  // '1小时, 1分钟, 2秒'
 * formatDuration(3600000, { locale: 'en-US' });  // '1 hour'
 * ```
 * @public
 */
export function formatDuration(
  durationMs: number,
  options: FormatDurationOptions = {}
): string {
  // 将毫秒转换为秒
  const seconds = Math.floor(durationMs / 1000);

  // 计算各个时间单位
  const years = Math.floor(seconds / (365 * 24 * 60 * 60));
  const months = Math.floor(
    (seconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60)
  );
  const days = Math.floor((seconds % (30 * 24 * 60 * 60)) / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const remainingSeconds = seconds % 60;

  // 准备持续时间对象
  const duration: Duration = {
    years,
    months,
    days,
    hours,
    minutes,
    seconds: remainingSeconds
  };

  const locale = getLocale(options.locale);

  return dateFnsFormatDuration(duration, {
    format: options.format,
    delimiter: options.delimiter || ' ',
    locale,
    zero: options.zero || false
  });
}
