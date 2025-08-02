/**
 * 工具函数统一导出
 */

// 具体导出避免循环依赖

// 便捷函数重新导出
export {
  LogLevel,
  Logger,
  createLogger,
  createOperationLogger,
  createQueueLogger,
  defaultLogger
} from './logger.js';

export {
  Validator,
  validateBatch,
  validateConsumerOptions,
  validateMessage,
  validateProducerConfig,
  validateQueueConfig,
  validateQueueName,
  validateRedisNode
} from './validator.js';

export {
  ConsistentHash,
  WeightedRoundRobin,
  crc16,
  djb2Hash,
  fnv1aHash,
  generateMessageId,
  generateUUID,
  getRedisSlot,
  simpleHash
} from './hash.js';

// ID生成工具
export {
  generateMessageId as generateMessageIdFromId,
  generateShortId,
  generateStreamId,
  generateUUID as generateUUIDFromId
} from './id.js';

// 通用工具函数
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// 错误类型转换辅助函数
export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};

// 检查错误消息是否包含特定文本
export const hasErrorMessage = (error: unknown, message: string): boolean => {
  const err = toError(error);
  return err.message.includes(message);
};

export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${ms}ms`)),
        ms
      )
    )
  ]);
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delay: number = 1000,
  backoff: number = 1.5
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await sleep(delay * Math.pow(backoff, attempt - 1));
    }
  }

  throw lastError!;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;

  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
};

export const isPlainObject = (obj: any): obj is Record<string, any> => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    !(obj instanceof Date) &&
    !(obj instanceof RegExp)
  );
};

export const merge = <T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T => {
  if (!sources.length) return target;

  const source = sources.shift();
  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key in source) {
      if (isPlainObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        merge(target[key] as T, source[key] as Partial<T>);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return merge(target, ...sources);
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

export const parseConnectionString = (
  connectionString: string
): { host: string; port: number } => {
  const match = connectionString.match(/^([^:]+):(\d+)$/);
  if (!match) {
    throw new Error(`Invalid connection string format: ${connectionString}`);
  }

  return {
    host: match[1],
    port: parseInt(match[2], 10)
  };
};

export const safeJsonParse = <T = any>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

export const safeJsonStringify = (obj: any, defaultValue = '{}'): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
};
