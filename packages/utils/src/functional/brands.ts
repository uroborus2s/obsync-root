/**
 * 品牌类型系统 - 提供类型安全的值对象
 */

import {
  type Brand,
  type BrandConstructor,
  type BrandValidator
} from './types.js';

/**
 * 创建品牌类型构造器
 */
export const createBrand = <T, B extends string>(
  brand: B,
  validator?: (value: unknown) => value is T
): BrandConstructor<T, B> => {
  return (value: T): Brand<T, B> => {
    if (validator && !validator(value)) {
      throw new Error(`Invalid value for brand ${brand}: ${value}`);
    }
    return value as Brand<T, B>;
  };
};

/**
 * 常用品牌类型定义
 */

// 用户ID
export type UserId = Brand<string, 'UserId'>;
const isUserId: BrandValidator<string> = (value): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  /^[a-zA-Z0-9_-]+$/.test(value);
export const UserId = createBrand<string, 'UserId'>('UserId', isUserId);

// 邮箱地址
export type EmailAddress = Brand<string, 'EmailAddress'>;
const isEmailAddress: BrandValidator<string> = (value): value is string =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const EmailAddress = createBrand<string, 'EmailAddress'>(
  'EmailAddress',
  isEmailAddress
);

// URL
export type Url = Brand<string, 'Url'>;
const isUrl: BrandValidator<string> = (value): value is string => {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};
export const Url = createBrand<string, 'Url'>('Url', isUrl);

// 正整数
export type PositiveInteger = Brand<number, 'PositiveInteger'>;
const isPositiveInteger: BrandValidator<number> = (value): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;
export const PositiveInteger = createBrand<number, 'PositiveInteger'>(
  'PositiveInteger',
  isPositiveInteger
);

// 非负数
export type NonNegativeNumber = Brand<number, 'NonNegativeNumber'>;
const isNonNegativeNumber: BrandValidator<number> = (value): value is number =>
  typeof value === 'number' && !Number.isNaN(value) && value >= 0;
export const NonNegativeNumber = createBrand<number, 'NonNegativeNumber'>(
  'NonNegativeNumber',
  isNonNegativeNumber
);

// 百分比 (0-100)
export type Percentage = Brand<number, 'Percentage'>;
const isPercentage: BrandValidator<number> = (value): value is number =>
  typeof value === 'number' &&
  !Number.isNaN(value) &&
  value >= 0 &&
  value <= 100;
export const Percentage = createBrand<number, 'Percentage'>(
  'Percentage',
  isPercentage
);

// 时间戳
export type Timestamp = Brand<number, 'Timestamp'>;
const isTimestamp: BrandValidator<number> = (value): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;
export const Timestamp = createBrand<number, 'Timestamp'>(
  'Timestamp',
  isTimestamp
);

// JSON字符串
export type JsonString = Brand<string, 'JsonString'>;
const isJsonString: BrandValidator<string> = (value): value is string => {
  if (typeof value !== 'string') return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};
export const JsonString = createBrand<string, 'JsonString'>(
  'JsonString',
  isJsonString
);

// Base64字符串
export type Base64String = Brand<string, 'Base64String'>;
const isBase64String: BrandValidator<string> = (value): value is string =>
  typeof value === 'string' &&
  /^[A-Za-z0-9+/]*={0,2}$/.test(value) &&
  value.length % 4 === 0;
export const Base64String = createBrand<string, 'Base64String'>(
  'Base64String',
  isBase64String
);

// UUID
export type UUID = Brand<string, 'UUID'>;
const isUUID: BrandValidator<string> = (value): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
export const UUID = createBrand<string, 'UUID'>('UUID', isUUID);

// IP地址
export type IpAddress = Brand<string, 'IpAddress'>;
const isIpAddress: BrandValidator<string> = (value): value is string => {
  if (typeof value !== 'string') return false;
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(value) || ipv6Regex.test(value);
};
export const IpAddress = createBrand<string, 'IpAddress'>(
  'IpAddress',
  isIpAddress
);

// 端口号
export type Port = Brand<number, 'Port'>;
const isPort: BrandValidator<number> = (value): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 65535;
export const Port = createBrand<number, 'Port'>('Port', isPort);

/**
 * 品牌类型组合器
 */
export const combineBrands = <T, B1 extends string, B2 extends string>(
  brand1: BrandConstructor<T, B1>,
  brand2: BrandConstructor<T, B2>
) => {
  return (value: T): Brand<Brand<T, B1>, B2> => {
    const branded1 = brand1(value);
    return brand2(branded1 as T) as Brand<Brand<T, B1>, B2>;
  };
};

/**
 * 品牌类型转换器
 */
export const convertBrand = <T, B1 extends string, B2 extends string>(
  fromBrand: B1,
  toBrand: B2,
  converter?: (value: T) => T
) => {
  return (value: Brand<T, B1>): Brand<T, B2> => {
    const rawValue = value as T;
    const convertedValue = converter ? converter(rawValue) : rawValue;
    return convertedValue as Brand<T, B2>;
  };
};

/**
 * 品牌类型映射器
 */
export const mapBrand = <T, U, B extends string>(
  mapper: (value: T) => U,
  brand: BrandConstructor<U, B>
) => {
  return (value: Brand<T, any>): Brand<U, B> => {
    const rawValue = value as T;
    const mappedValue = mapper(rawValue);
    return brand(mappedValue);
  };
};

/**
 * 多品牌类型验证
 */
export const validateBrands = <T>(
  value: T,
  ...validators: Array<BrandValidator<T>>
): boolean => {
  return validators.every((validator) => validator(value));
};

/**
 * ID生成器工厂
 */
export const createIdGenerator = <B extends string>(
  brand: B,
  prefix = '',
  generator: () => string = () => Math.random().toString(36).substr(2, 9)
): (() => Brand<string, B>) => {
  const brandConstructor = createBrand<string, B>(brand);

  return () => {
    const id = prefix + generator();
    return brandConstructor(id);
  };
};

/**
 * UUID生成器
 */
export const generateUUID = (): UUID => {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return UUID(uuid);
};

/**
 * 当前时间戳生成器
 */
export const now = (): Timestamp => {
  return Timestamp(Date.now());
};
