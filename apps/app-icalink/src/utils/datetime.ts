// @wps/app-icalink 时间工具函数
// 基于 date-fns 库的时间处理工具

import {
  addDays,
  addHours,
  addMinutes,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  getDay,
  getMonth,
  getYear,
  isValid,
  isWeekend as isWeekendFns,
  isWithinInterval,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化日期为字符串
 * @param date 日期对象
 * @param formatStr 格式字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: Date,
  formatStr: string = 'yyyy-MM-dd'
): string {
  return format(date, formatStr, { locale: zhCN });
}

/**
 * 格式化日期时间为字符串
 * @param date 日期对象
 * @returns ISO格式的日期时间字符串
 */
export function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * 格式化日期时间为本地时间字符串，不做时区转换
 * @param date 日期对象
 * @returns 本地时间字符串，格式为 YYYY-MM-DD HH:mm:ss
 */
export function formatLocalDateTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 格式化为中文日期时间
 * @param date 日期对象
 * @returns 中文格式的日期时间字符串
 */
export function formatDateTimeCN(date: Date): string {
  return format(date, 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
}

/**
 * 解析日期字符串
 * @param dateString 日期字符串
 * @param formatStr 格式字符串（可选）
 * @returns 日期对象
 */
export function parseDate(dateString: string, formatStr?: string): Date {
  if (formatStr) {
    return parse(dateString, formatStr, new Date());
  }
  return parseISO(dateString);
}

/**
 * 验证日期是否有效
 * @param date 日期对象
 * @returns 是否有效
 */
export function isValidDate(date: Date): boolean {
  return isValid(date);
}

/**
 * 获取当前日期（不包含时间）
 * @returns 当前日期
 */
export function getCurrentDate(): Date {
  return startOfDay(new Date());
}

/**
 * 获取当前日期时间
 * @returns 当前日期时间
 */
export function getCurrentDateTime(): Date {
  return new Date();
}

/**
 * 计算两个日期之间的天数差
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 天数差
 */
export function getDaysDifference(startDate: Date, endDate: Date): number {
  return differenceInDays(endDate, startDate);
}

/**
 * 计算两个时间之间的分钟差
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @returns 分钟差
 */
export function getMinutesDifference(startTime: Date, endTime: Date): number {
  return differenceInMinutes(endTime, startTime);
}

/**
 * 计算两个时间之间的小时差
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @returns 小时差
 */
export function getHoursDifference(startTime: Date, endTime: Date): number {
  return differenceInHours(endTime, startTime);
}

/**
 * 添加天数到日期
 * @param date 原始日期
 * @param days 要添加的天数
 * @returns 新的日期
 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

/**
 * 添加小时到日期时间
 * @param date 原始日期时间
 * @param hours 要添加的小时数
 * @returns 新的日期时间
 */
export function addHoursToDate(date: Date, hours: number): Date {
  return addHours(date, hours);
}

/**
 * 添加分钟到日期时间
 * @param date 原始日期时间
 * @param minutes 要添加的分钟数
 * @returns 新的日期时间
 */
export function addMinutesToDate(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

/**
 * 获取日期的开始时间（00:00:00）
 * @param date 日期
 * @returns 日期的开始时间
 */
export function getStartOfDay(date: Date): Date {
  return startOfDay(date);
}

/**
 * 获取日期的结束时间（23:59:59.999）
 * @param date 日期
 * @returns 日期的结束时间
 */
export function getEndOfDay(date: Date): Date {
  return endOfDay(date);
}

/**
 * 获取本周的开始日期（周一）
 * @param date 参考日期
 * @returns 本周开始日期
 */
export function getStartOfWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // 周一开始
}

/**
 * 获取本周的结束日期（周日）
 * @param date 参考日期
 * @returns 本周结束日期
 */
export function getEndOfWeek(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 }); // 周一开始
}

/**
 * 获取本月的开始日期
 * @param date 参考日期
 * @returns 本月开始日期
 */
export function getStartOfMonth(date: Date): Date {
  return startOfMonth(date);
}

/**
 * 获取本月的结束日期
 * @param date 参考日期
 * @returns 本月结束日期
 */
export function getEndOfMonth(date: Date): Date {
  return endOfMonth(date);
}

/**
 * 检查日期是否在指定范围内
 * @param date 要检查的日期
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 是否在范围内
 */
export function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date
): boolean {
  return isWithinInterval(date, { start: startDate, end: endDate });
}

/**
 * 检查时间是否在指定时间窗口内
 * @param time 要检查的时间
 * @param windowStart 窗口开始时间
 * @param windowEnd 窗口结束时间
 * @returns 是否在窗口内
 */
export function isTimeInWindow(
  time: Date,
  windowStart: Date,
  windowEnd: Date
): boolean {
  return isWithinInterval(time, { start: windowStart, end: windowEnd });
}

/**
 * 获取学期字符串
 * @param date 日期
 * @returns 学期字符串（如：2024-1）
 */
export function getSemester(date: Date): string {
  const year = getYear(date);
  const month = getMonth(date) + 1; // getMonth返回0-11

  // 春季学期：2-7月，秋季学期：8月-次年1月
  if (month >= 2 && month <= 7) {
    return `${year}-2`; // 春季学期
  } else if (month >= 8) {
    return `${year}-1`; // 秋季学期
  } else {
    return `${year - 1}-1`; // 上一年的秋季学期
  }
}

/**
 * 获取教学周
 * @param date 日期
 * @param semesterStartDate 学期开始日期
 * @returns 教学周数
 */
export function getTeachingWeek(date: Date, semesterStartDate: Date): number {
  const daysDiff = getDaysDifference(semesterStartDate, date);
  return Math.ceil((daysDiff + 1) / 7);
}

/**
 * 获取星期几（1-7，周一为1）
 * @param date 日期
 * @returns 星期几
 */
export function getWeekDay(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 7 : day; // 将周日从0调整为7
}

/**
 * 格式化时间段
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @returns 时间段字符串
 */
export function formatTimeRange(startTime: Date, endTime: Date): string {
  const start = format(startTime, 'HH:mm');
  const end = format(endTime, 'HH:mm');
  return `${start}-${end}`;
}

/**
 * 解析时间字符串为时间对象
 * @param timeString 时间字符串（如：14:30）
 * @param baseDate 基准日期
 * @returns 时间对象
 */
export function parseTime(
  timeString: string,
  baseDate: Date = new Date()
): Date {
  return parse(timeString, 'HH:mm', baseDate);
}

/**
 * 检查是否为工作日
 * @param date 日期
 * @returns 是否为工作日
 */
export function isWorkday(date: Date): boolean {
  return !isWeekendFns(date);
}

/**
 * 检查是否为周末
 * @param date 日期
 * @returns 是否为周末
 */
export function isWeekend(date: Date): boolean {
  return isWeekendFns(date);
}

/**
 * 获取相对时间描述
 * @param date 日期
 * @param baseDate 基准日期
 * @returns 相对时间描述
 */
export function getRelativeTime(
  date: Date,
  baseDate: Date = new Date()
): string {
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: zhCN,
    includeSeconds: true
  });
}

/**
 * 时区转换 - 转换为中国时区
 * @param date 日期
 * @param timezone 目标时区
 * @returns 转换后的日期
 */
export function convertToTimezone(
  date: Date,
  timezone: string = 'Asia/Shanghai'
): Date {
  // 简化版本：仅处理Asia/Shanghai时区 (+8)
  if (timezone === 'Asia/Shanghai') {
    return new Date(date.getTime() + 8 * 60 * 60 * 1000);
  }
  return date;
}

/**
 * 转换为UTC时间
 * @param date 本地时间
 * @param timezone 源时区
 * @returns UTC时间
 */
export function convertToUTC(
  date: Date,
  timezone: string = 'Asia/Shanghai'
): Date {
  // 简化版本：仅处理Asia/Shanghai时区 (+8)
  if (timezone === 'Asia/Shanghai') {
    return new Date(date.getTime() - 8 * 60 * 60 * 1000);
  }
  return date;
}

/**
 * 获取今天的日期范围
 * @returns 今天的开始和结束时间
 */
export function getTodayRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: getStartOfDay(today),
    end: getEndOfDay(today)
  };
}

/**
 * 获取本周的日期范围
 * @returns 本周的开始和结束时间
 */
export function getThisWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: getStartOfWeek(today),
    end: getEndOfWeek(today)
  };
}

/**
 * 获取本月的日期范围
 * @returns 本月的开始和结束时间
 */
export function getThisMonthRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: getStartOfMonth(today),
    end: getEndOfMonth(today)
  };
}

/**
 * 检查是否为今天
 * @param date 要检查的日期
 * @returns 是否为今天
 */
export function isToday(date: Date): boolean {
  const today = getCurrentDate();
  const checkDate = getStartOfDay(date);
  return checkDate.getTime() === today.getTime();
}

/**
 * 检查是否为本周
 * @param date 要检查的日期
 * @returns 是否为本周
 */
export function isThisWeek(date: Date): boolean {
  const { start, end } = getThisWeekRange();
  return isDateInRange(date, start, end);
}

/**
 * 检查是否为本月
 * @param date 要检查的日期
 * @returns 是否为本月
 */
export function isThisMonth(date: Date): boolean {
  const { start, end } = getThisMonthRange();
  return isDateInRange(date, start, end);
}
