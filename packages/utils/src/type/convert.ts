/**
 * 类型转换相关函数
 */

import {
  isArray,
  isIterable,
  isNil,
  isPlainObject,
  isString
} from './check.js';

/**
 * 将值转换为字符串
 * @param value 要转换的值
 * @returns 转换后的字符串
 */
export function toString(value: any): string {
  if (isNil(value)) {
    return '';
  }

  if (isString(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(',');
  }

  return String(value);
}

/**
 * 将值转换为数字
 * @param value 要转换的值
 * @returns 转换后的数字，如果无法转换则返回 NaN
 */
export function toNumber(value: any): number {
  if (value === null) {
    return 0;
  }

  if (value === undefined) {
    return NaN;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (isString(value)) {
    // 去除前后空格
    const trimmed = value.trim();
    if (trimmed === '') {
      return 0;
    }
    return Number(trimmed);
  }

  if (isArray(value)) {
    if (value.length === 0) {
      return 0;
    }
    if (value.length === 1) {
      return toNumber(value[0]);
    }
    return NaN;
  }

  return Number(value);
}

/**
 * 将值转换为整数
 * @param value 要转换的值
 * @returns 转换后的整数，小数部分会被截断，如果无法转换则返回 0
 */
export function toInteger(value: any): number {
  const number = toNumber(value);
  if (isNaN(number)) {
    return 0;
  }

  return Math.trunc(number);
}

/**
 * 将值转换为布尔值
 * @param value 要转换的值
 * @returns 转换后的布尔值
 */
export function toBoolean(value: any): boolean {
  if (isString(value) && value.toLowerCase() === 'false') {
    return false;
  }

  return Boolean(value);
}

/**
 * 将值转换为数组
 * @param value 要转换的值
 * @returns 如果输入已经是数组，则直接返回；否则将输入值放入一个新数组并返回
 */
export function toArray<T>(value: T | T[]): T[] {
  if (isNil(value)) {
    return [];
  }

  if (isArray(value)) {
    return value;
  }

  if (isIterable(value) && !isString(value)) {
    return Array.from(value as Iterable<T>);
  }

  return [value] as T[];
}

/**
 * 将值转换为对象
 * @param value 要转换的值
 * @returns 转换后的对象
 */
export function toObject(value: any): Record<string, any> {
  if (isNil(value)) {
    return {};
  }

  if (isPlainObject(value)) {
    return value;
  }

  if (isMap(value)) {
    const result: Record<string, any> = {};
    value.forEach((value, key) => {
      result[String(key)] = value;
    });
    return result;
  }

  if (isArray(value)) {
    if (value.every((item) => isArray(item) && item.length === 2)) {
      const result: Record<string, any> = {};
      for (const [key, val] of value) {
        result[String(key)] = val;
      }
      return result;
    }

    return { ...value };
  }

  if (isString(value)) {
    const result: Record<string, any> = {};
    for (let i = 0; i < value.length; i++) {
      result[i] = value[i];
    }
    return result;
  }

  if (typeof value === 'object') {
    return { ...value };
  }

  return { value };
}

/**
 * 将值转换为日期对象
 * @param value 要转换的值
 * @returns 转换后的日期对象，如果无法转换则返回无效日期（new Date(NaN)）
 */
export function toDate(value: any): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (isArray(value) && value.length >= 3) {
    // 假设数组格式为 [year, month, day, hours, minutes, seconds, ms]
    const [year, month, day, hours = 0, minutes = 0, seconds = 0, ms = 0] =
      value;
    return new Date(year, month, day, hours, minutes, seconds, ms);
  }

  if (isString(value)) {
    const date = new Date(value);
    return date;
  }

  return new Date(NaN);
}

/**
 * 确保值为指定类型，如果不是则转换或返回默认值
 * @param value 要检查的值
 * @param type 期望的类型字符串
 * @param defaultValue 如果转换失败时的默认值（可选）
 * @returns 如果值已经是期望的类型，则直接返回；如果不是，则尝试转换，转换失败则返回默认值
 */
export function ensureType<T>(value: any, type: string, defaultValue?: T): T {
  const typeToLower = type.toLowerCase();

  // 检查值的当前类型是否已经是期望的类型
  if (getType(value) === typeToLower) {
    return value as T;
  }

  let result: any;

  // 尝试转换为期望的类型
  switch (typeToLower) {
    case 'string':
      result = toString(value);
      break;
    case 'number':
      result = toNumber(value);
      if (isNaN(result) && defaultValue !== undefined) {
        result = defaultValue;
      }
      break;
    case 'integer':
      result = toInteger(value);
      break;
    case 'boolean':
      result = toBoolean(value);
      break;
    case 'array':
      result = toArray(value);
      break;
    case 'object':
      result = toObject(value);
      break;
    case 'date':
      result = toDate(value);
      if (isNaN(result.getTime()) && defaultValue !== undefined) {
        result = defaultValue;
      }
      break;
    default:
      // 如果没有匹配的类型转换，则返回默认值
      result = defaultValue !== undefined ? defaultValue : value;
  }

  return result as T;
}

/**
 * 强制类型转换
 * @param value 要转换的值
 * @param targetType 目标类型字符串
 * @returns 转换后的值
 */
export function typeCast<T>(value: any, targetType: string): T {
  const type = targetType.toLowerCase();

  switch (type) {
    case 'string':
      return toString(value) as unknown as T;
    case 'number':
      return toNumber(value) as unknown as T;
    case 'integer':
      return toInteger(value) as unknown as T;
    case 'boolean':
      return toBoolean(value) as unknown as T;
    case 'array':
      // 对于字符串，尝试解析JSON
      if (isString(value) && value.trim().startsWith('[')) {
        try {
          return JSON.parse(value) as unknown as T;
        } catch {
          return toArray(value) as unknown as T;
        }
      }
      return toArray(value) as unknown as T;
    case 'object':
      // 对于字符串，尝试解析JSON
      if (isString(value) && value.trim().startsWith('{')) {
        try {
          return JSON.parse(value) as unknown as T;
        } catch {
          return toObject(value) as unknown as T;
        }
      }
      return toObject(value) as unknown as T;
    case 'date':
      return toDate(value) as unknown as T;
    default:
      return value as T;
  }
}

/**
 * 是否为 Map 对象
 * @param value 要检查的值
 * @returns 如果值为 Map 对象则返回 true，否则返回 false
 */
function isMap(value: any): value is Map<any, any> {
  return value instanceof Map;
}

/**
 * 获取值的具体类型
 * @param value 要检查的值
 * @returns 表示值类型的小写字符串，如 'string', 'number', 'object', 'array' 等
 */
function getType(value: any): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (isArray(value)) {
    return 'array';
  }

  if (value instanceof Date) {
    return 'date';
  }

  if (value instanceof RegExp) {
    return 'regexp';
  }

  if (value instanceof Error) {
    return 'error';
  }

  if (value instanceof Map) {
    return 'map';
  }

  if (value instanceof Set) {
    return 'set';
  }

  return typeof value;
}
