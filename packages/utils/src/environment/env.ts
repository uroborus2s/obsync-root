/**
 * 环境变量工具函数模块
 *
 * 提供用于处理环境变量的实用工具函数，帮助开发者安全地读取、验证和管理应用程序的环境配置。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境变量
 *
 * @packageDocumentation
 */

/**
 * 获取指定环境变量的值，支持默认值和自定义转换
 *
 * @param key - 环境变量名称
 * @param defaultValue - 如果环境变量不存在时的默认值（可选）
 * @param transform - 自定义转换函数，用于处理环境变量值（可选）
 * @returns 环境变量的值（字符串或转换后的值）
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境变量获取
 *
 * @example
 * ```typescript
 * // 获取字符串环境变量
 * const apiUrl = get('API_URL', 'https://default-api.com');
 *
 * // 使用转换函数
 * const port = get('PORT', '3000', (value) => parseInt(value, 10));
 * ```
 * @public
 */
export function get<T = string>(
  key: string,
  defaultValue?: string,
  transform?: (value: string) => T
): string | T | undefined {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (transform) {
    return transform(value);
  }

  return value;
}

/**
 * 获取环境变量的布尔值
 *
 * 'true', '1', 'yes' 被视为 true
 * 'false', '0', 'no' 被视为 false
 *
 * @param key - 环境变量名称
 * @param defaultValue - 如果环境变量不存在时的默认布尔值（可选）
 * @returns 环境变量的布尔值
 * @remarks
 * 版本: 1.0.0
 * 分类: 环境变量获取
 *
 * @example
 * ```typescript
 * // 检查是否启用调试模式
 * const isDebug = getBoolean('DEBUG', false);
 *
 * // 检查功能标志
 * const isFeatureEnabled = getBoolean('FEATURE_X_ENABLED');
 * ```
 * @public
 */
export function getBoolean(
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = get(key);

  if (value === undefined) {
    return defaultValue;
  }

  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

/**
 * 获取环境变量的数值。
 *
 * @param key - 环境变量名称
 * @param defaultValue - 如果环境变量不存在或无法解析为数字时的默认值（可选）
 * @returns 环境变量的数值
 */
export function getNumber(key: string, defaultValue: number = 0): number {
  const value = get(key);

  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 获取环境变量的数组值，通过分隔符分割字符串。
 *
 * @param key - 环境变量名称
 * @param defaultValue - 如果环境变量不存在时的默认数组（可选）
 * @param separator - 用于分割字符串的分隔符（默认为','）
 * @returns 由环境变量值分割而成的字符串数组
 */
export function getArray(
  key: string,
  defaultValue: string[] = [],
  separator: string = ','
): string[] {
  const value = get(key);

  if (value === undefined) {
    return defaultValue;
  }

  return value.split(separator).map((item) => item.trim());
}

/**
 * 获取环境变量的对象值，解析JSON字符串。
 *
 * @param key - 环境变量名称
 * @param defaultValue - 如果环境变量不存在或无法解析为对象时的默认对象（可选）
 * @returns 由环境变量JSON字符串解析而成的对象
 */
export function getObject<T extends Record<string, any>>(
  key: string,
  defaultValue: T = {} as T
): T {
  const value = get(key);

  if (value === undefined) {
    return defaultValue;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 检查当前环境是否为开发环境。
 *
 * @returns 如果NODE_ENV为'development'则返回true，否则返回false
 */
export function isDevelopment(): boolean {
  return getNodeEnv() === 'development';
}

/**
 * 检查当前环境是否为生产环境。
 *
 * @returns 如果NODE_ENV为'production'则返回true，否则返回false
 */
export function isProduction(): boolean {
  return getNodeEnv() === 'production';
}

/**
 * 检查当前环境是否为测试环境。
 *
 * @returns 如果NODE_ENV为'test'则返回true，否则返回false
 */
export function isTest(): boolean {
  return getNodeEnv() === 'test';
}

/**
 * 获取当前的NODE_ENV值。
 *
 * @returns NODE_ENV环境变量的值，如果未设置，则返回'development'
 */
export function getNodeEnv(): string {
  const nodeEnv = get('NODE_ENV', 'development');
  return nodeEnv as string;
}

/**
 * 检查是否存在指定的环境变量。
 *
 * @param key - 环境变量名称
 * @returns 如果环境变量存在且不为空则返回true，否则返回false
 */
export function hasEnv(key: string): boolean {
  const value = get(key);
  return value !== undefined;
}

/**
 * 获取必要的环境变量值，如果不存在则抛出错误。
 *
 * @param key - 环境变量名称
 * @param message - 自定义错误消息（可选）
 * @returns 环境变量的值
 * @throws 如果环境变量不存在或为空，则抛出错误
 */
export function required(key: string, message?: string): string {
  const value = get(key);

  if (value === undefined) {
    throw new Error(message || `环境变量 ${key} 是必需的`);
  }

  return value;
}

/**
 * 获取所有环境变量的副本。
 *
 * @returns 包含所有环境变量的对象
 */
export function getAll(): Record<string, string> {
  // 创建一个新对象并确保值都是字符串类型
  const env: Record<string, string> = {};

  // 复制环境变量，同时确保所有值都是字符串
  for (const key in process.env) {
    if (
      Object.prototype.hasOwnProperty.call(process.env, key) &&
      process.env[key] !== undefined
    ) {
      env[key] = process.env[key] as string;
    }
  }

  return env;
}

/**
 * 临时设置环境变量（仅在运行时有效）。
 *
 * @param key - 环境变量名称
 * @param value - 环境变量值
 */
export function set(key: string, value: string): void {
  process.env[key] = value;
}
