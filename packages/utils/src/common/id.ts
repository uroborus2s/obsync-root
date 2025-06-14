/**
 * ID生成工具函数，提供多种唯一标识符生成方法
 *
 * 本模块提供多种格式的唯一标识符生成函数，包括数字ID和UUID。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: ID生成
 *
 * @packageDocumentation
 */
import { format, isValid, parse } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

/**
 * 生成数字格式的唯一ID
 *
 * 生成指定范围内的随机数字ID。
 *
 * @param min - 最小值，默认为4
 * @param max - 最大值，默认为16
 * @returns 数字格式的唯一ID字符串
 * @throws `RangeError` 如果min大于max
 * @remarks
 * 版本: 1.0.0
 * 分类: ID生成
 *
 * @example
 * ```typescript
 * generateNumberId();      // 例如 '8'
 * generateNumberId(10, 99); // 例如 '42'
 * ```
 * @public
 */
export function generateNumberId(min: number = 4, max: number = 16): string {
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * 生成UUID格式的唯一ID
 *
 * 使用标准的UUID v4算法生成唯一标识符。
 *
 * @returns UUID格式的唯一ID
 * @remarks
 * 版本: 1.0.0
 * 分类: ID生成
 *
 * @example
 * ```typescript
 * generateUuid(); // 例如 '550e8400-e29b-41d4-a716-446655440000'
 * ```
 * @public
 */
export function generateUuid(): string {
  return uuidv4();
}

/**
 * 生成通用唯一ID
 *
 * 生成默认的唯一标识符，当前实现为UUID格式。
 *
 * @returns 唯一ID
 * @remarks
 * 版本: 1.0.0
 * 分类: ID生成
 *
 * @example
 * ```typescript
 * generateId(); // 例如 '550e8400-e29b-41d4-a716-446655440000'
 * ```
 * @public
 */
export function generateId(): string {
  return generateUuid();
}

/**
 * 生成任务ID
 */
export function generateTaskId(type: 'FULL' | 'INCREMENTAL' = 'FULL'): string {
  const timestamp = format(new Date(), 'yyyyMMddHHmmss');
  const randomSuffix = uuidv4().split('-')[0].toUpperCase();
  return `t_${timestamp}_${randomSuffix}`;
}

/**
 * 生成唯一映射ID
 */
export function generateMappingId(): string {
  return uuidv4();
}

/**
 * 验证日期格式
 */
export function validateDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  // 支持多种日期格式
  const formats = ['yyyy-MM-dd', 'yyyy/MM/dd', 'yyyyMMdd'];

  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (isValid(parsed)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * 标准化日期字符串
 */
export function normalizeDateString(dateStr: string): string {
  if (!validateDateString(dateStr)) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }

  const formats = ['yyyy-MM-dd', 'yyyy/MM/dd', 'yyyyMMdd'];

  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Cannot parse date string: ${dateStr}`);
}

/**
 * 验证学期格式
 */
export function validateSemester(semester: string): boolean {
  if (!semester || typeof semester !== 'string') {
    return false;
  }

  // 学期格式：YYYY-YYYY-N，例如：2023-2024-1
  const semesterRegex = /^\d{4}-\d{4}-[12]$/;
  return semesterRegex.test(semester);
}

/**
 * 解析学期信息
 */
export function parseSemester(semester: string): {
  startYear: number;
  endYear: number;
  term: number;
} {
  if (!validateSemester(semester)) {
    throw new Error(`Invalid semester format: ${semester}`);
  }

  const parts = semester.split('-');
  return {
    startYear: parseInt(parts[0]),
    endYear: parseInt(parts[1]),
    term: parseInt(parts[2])
  };
}

/**
 * 生成当前学期
 */
export function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 月份从0开始

  // 9月-2月为第一学期，3月-8月为第二学期
  if (month >= 9) {
    return `${year}-${year + 1}-1`;
  } else if (month >= 3) {
    return `${year - 1}-${year}-2`;
  } else {
    return `${year - 1}-${year}-1`;
  }
}

/**
 * 计算百分比
 */
export function calculatePercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * 格式化处理速度
 */
export function formatProcessingSpeed(recordsPerMinute: number): string {
  if (recordsPerMinute < 1) {
    return '< 1 记录/分钟';
  } else if (recordsPerMinute < 60) {
    return `${Math.round(recordsPerMinute)} 记录/分钟`;
  } else {
    const recordsPerSecond = recordsPerMinute / 60;
    return `${Math.round(recordsPerSecond)} 记录/秒`;
  }
}

/**
 * 格式化时间间隔
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  times: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < times - 1) {
        await delay(delayMs * (i + 1)); // 指数退避
      }
    }
  }

  throw lastError!;
}

/**
 * 分批处理函数
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * 限制并发函数
 */
export async function limitConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // 移除已完成的promise
      for (let i = executing.length - 1; i >= 0; i--) {
        if (
          (await Promise.race([executing[i], Promise.resolve('resolved')])) ===
          'resolved'
        ) {
          executing.splice(i, 1);
        }
      }
    }
  }

  // 等待所有剩余的promise完成
  await Promise.all(executing);
  return results;
}

/**
 * 安全解析JSON
 */
export function safeParseJSON<T = any>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

/**
 * 验证开课号格式
 */
export function validateKkh(kkh: string): boolean {
  if (!kkh || typeof kkh !== 'string') {
    return false;
  }
  // 开课号通常是数字或字母数字组合，长度在5-20之间
  return /^[A-Za-z0-9]{5,20}$/.test(kkh);
}

/**
 * 验证学号格式
 */
export function validateStudentId(studentId: string): boolean {
  if (!studentId || typeof studentId !== 'string') {
    return false;
  }
  // 学号通常是数字，长度在8-15之间
  return /^\d{8,15}$/.test(studentId);
}

/**
 * 验证工号格式
 */
export function validateEmployeeId(employeeId: string): boolean {
  if (!employeeId || typeof employeeId !== 'string') {
    return false;
  }
  // 工号可以是数字或字母数字组合，长度在4-12之间
  return /^[A-Za-z0-9]{4,12}$/.test(employeeId);
}
