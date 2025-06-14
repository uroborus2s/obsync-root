/**
 * 通用数据验证工具函数，提供各种验证功能
 *
 * 该模块提供了各种数据验证工具函数，包括字符串格式验证、数值验证、日期验证等。
 * 支持单个值的验证以及组合验证规则应用于复杂数据结构。
 * 整合了所有验证相关功能，包括简单验证和复杂验证。
 *
 * @remarks
 * 模块: 数据验证
 * 版本: 1.0.0
 * 分类: 工具函数
 *
 * @example
 * ```typescript
 * import { isEmail, isURL, isStrongPassword } from '@stratix/utils/common/validator';
 *
 * isEmail('user@example.com'); // true
 * isURL('https://example.com'); // true
 * isStrongPassword('Abc123!@#', { minLength: 8 }); // true
 * ```
 *
 * @packageDocumentation
 */

// 导入基础类型检查函数
import { isEmpty, isNotEmpty } from '../data/compare.js';
import { isObject } from '../data/object.js';
import {
  isArray,
  isBoolean,
  isDate,
  isNil,
  isNumber,
  isString
} from './guards.js';

// 导出基础类型检查函数以便方便使用
export {
  isArray,
  isBoolean,
  isDate,
  isEmpty,
  isNil,
  isNotEmpty,
  isNumber,
  isObject,
  isString
};

/**
 * 电子邮件验证选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface EmailOptions {
  /**
   * 是否允许显示名称，例如 "Display Name <email\@example.com\>"
   *
   * @defaultValue false
   */
  allowDisplayName?: boolean;

  /**
   * 是否要求顶级域名，如果为false，则接受没有TLD的邮箱
   *
   * @defaultValue true
   */
  requireTLD?: boolean;

  /**
   * 是否允许IP域名，如 "email\@[192.168.1.1]"
   *
   * @defaultValue false
   */
  allowIPDomain?: boolean;
}

/**
 * URL验证选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface URLOptions {
  /**
   * 允许的协议列表
   *
   * @defaultValue ['http', 'https']
   */
  protocols?: string[];

  /**
   * 是否要求URL包含协议部分
   *
   * @defaultValue false
   */
  requireProtocol?: boolean;

  /**
   * 是否要求有效的协议（在protocols列表中）
   *
   * @defaultValue true
   */
  requireValidProtocol?: boolean;

  /**
   * 是否允许查询参数
   *
   * @defaultValue true
   */
  allowQuery?: boolean;

  /**
   * 是否允许片段标识符
   *
   * @defaultValue true
   */
  allowFragment?: boolean;
}

/**
 * 密码强度验证选项接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface PasswordOptions {
  /**
   * 最小长度
   *
   * @defaultValue 8
   */
  minLength?: number;

  /**
   * 最少小写字母数量
   *
   * @defaultValue 1
   */
  minLowercase?: number;

  /**
   * 最少大写字母数量
   *
   * @defaultValue 1
   */
  minUppercase?: number;

  /**
   * 最少数字数量
   *
   * @defaultValue 1
   */
  minNumbers?: number;

  /**
   * 最少特殊符号数量
   *
   * @defaultValue 1
   */
  minSymbols?: number;
}

/**
 * 验证字符串是否为有效的电子邮件地址
 *
 * @example
 * ```typescript
 * isEmail('user@example.com'); // true
 * isEmail('invalid-email'); // false
 * isEmail('user@example.com', { requireTLD: false }); // true
 * ```
 *
 * @param value - 要验证的字符串
 * @param options - 验证选项
 * @returns 如果是有效的电子邮件地址则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isEmail(value: string, options: EmailOptions = {}): boolean {
  if (!value || typeof value !== 'string') return false;

  // 默认选项
  const opts = {
    allowDisplayName: options.allowDisplayName || false,
    requireTLD: options.requireTLD !== undefined ? options.requireTLD : true,
    allowIPDomain: options.allowIPDomain || false
  };

  // 如果允许显示名称，先移除它
  if (opts.allowDisplayName) {
    const displayName = value.match(/(.+)<(.+)>/);
    if (displayName) {
      value = displayName[2];
    }
  }

  // 基本电子邮件格式验证
  const emailRegex = opts.requireTLD
    ? /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
    : /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(value)) return false;

  // 验证域名部分是否是IP地址
  if (opts.allowIPDomain) {
    const parts = value.split('@');
    const ipRegex =
      /^\[([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\]$/;
    const ipMatch = parts[1].match(ipRegex);

    if (ipMatch) {
      // 验证IP地址是否有效
      for (let i = 1; i <= 4; i++) {
        if (parseInt(ipMatch[i], 10) > 255) {
          return false;
        }
      }
      return true;
    }
  }

  return true;
}

/**
 * 验证字符串是否为有效的URL
 *
 * @example
 * ```typescript
 * isURL('https://example.com'); // true
 * isURL('example.com', { requireProtocol: false }); // true
 * isURL('ftp://example.com', { protocols: ['http', 'https'] }); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @param options - 验证选项
 * @returns 如果是有效的URL则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isURL(value: string, options: URLOptions = {}): boolean {
  if (!value || typeof value !== 'string') return false;

  // 默认选项
  const opts = {
    protocols: options.protocols || ['http', 'https'],
    requireProtocol: options.requireProtocol || false,
    requireValidProtocol:
      options.requireValidProtocol !== undefined
        ? options.requireValidProtocol
        : true,
    allowQuery: options.allowQuery !== undefined ? options.allowQuery : true,
    allowFragment:
      options.allowFragment !== undefined ? options.allowFragment : true
  };

  if (value.length === 0) return false;

  // 解析URL
  let url: URL;
  try {
    // 如果需要协议但URL没有协议，添加一个临时协议用于解析
    if (!value.includes('://') && !opts.requireProtocol) {
      url = new URL(`http://${value}`);
    } else {
      url = new URL(value);
    }
  } catch (e) {
    return false;
  }

  // 检查协议
  if (
    opts.requireValidProtocol &&
    !opts.protocols.includes(url.protocol.replace(':', ''))
  ) {
    return false;
  }

  // 检查协议要求
  if (opts.requireProtocol && !value.includes('://')) {
    return false;
  }

  // 检查查询参数
  if (!opts.allowQuery && url.search !== '') {
    return false;
  }

  // 检查片段
  if (!opts.allowFragment && url.hash !== '') {
    return false;
  }

  return true;
}

/**
 * 验证字符串是否为有效的URL (简化版)
 *
 * 此函数是isURL的别名，提供向后兼容性
 *
 * @example
 * ```typescript
 * isUrl('https://example.com'); // true
 * isUrl('invalid-url'); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @returns 如果是有效的URL则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 *
 * @deprecated 请使用 isURL 函数代替
 */
export function isUrl(value: string): boolean {
  return isURL(value);
}

/**
 * 验证字符串是否为有效的IP地址
 *
 * @example
 * ```typescript
 * isIP('192.168.1.1'); // true
 * isIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334', 6); // true
 * isIP('not an ip'); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @param version - IP版本 (4 或 6)，如果不指定则检查两种版本
 * @returns 如果是有效的IP地址则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isIP(value: string, version?: 4 | 6): boolean {
  if (!value || typeof value !== 'string') return false;

  // IPv4验证
  if (!version || version === 4) {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(value)) return true;
  }

  // IPv6验证
  if (!version || version === 6) {
    const ipv6Regex =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    if (ipv6Regex.test(value)) return true;
  }

  return false;
}

/**
 * 验证字符串是否只包含字母字符
 *
 * @example
 * ```typescript
 * isAlpha('abc'); // true
 * isAlpha('abc123'); // false
 * isAlpha('你好', 'zh-CN'); // true (中文字符)
 * ```
 *
 * @param value - 要验证的字符串
 * @param locale - 语言区域（影响字符集）
 * @returns 如果只包含字母字符则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isAlpha(value: string, locale?: string): boolean {
  if (!value || typeof value !== 'string') return false;

  // 简单的英文字母检查
  if (!locale || locale.startsWith('en')) {
    return /^[A-Za-z]+$/.test(value);
  }

  // 中文检查
  if (locale === 'zh-CN') {
    return /^[\u4e00-\u9fa5]+$/.test(value);
  }

  // 其他语言区域可以根据需要扩展
  return /^[A-Za-z]+$/.test(value);
}

/**
 * 验证字符串是否只包含字母和数字
 *
 * @example
 * ```typescript
 * isAlphanumeric('abc123'); // true
 * isAlphanumeric('abc-123'); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @param locale - 语言区域（影响字符集）
 * @returns 如果只包含字母和数字则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isAlphanumeric(value: string, locale?: string): boolean {
  if (!value || typeof value !== 'string') return false;

  // 英文字母和数字
  if (!locale || locale.startsWith('en')) {
    return /^[A-Za-z0-9]+$/.test(value);
  }

  // 中文、英文字母和数字
  if (locale === 'zh-CN') {
    return /^[\u4e00-\u9fa5A-Za-z0-9]+$/.test(value);
  }

  return /^[A-Za-z0-9]+$/.test(value);
}

/**
 * 验证字符串是否只包含数字
 *
 * @example
 * ```typescript
 * isNumeric('123'); // true
 * isNumeric('123.45'); // true
 * isNumeric('abc123'); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @returns 如果只包含数字则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isNumeric(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^-?\d+(\.\d+)?$/.test(value);
}

/**
 * 验证字符串是否是有效的Base64编码
 *
 * @example
 * ```typescript
 * isBase64('SGVsbG8gV29ybGQ='); // true
 * isBase64('Invalid base64!'); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @returns 如果是有效的Base64编码则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isBase64(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const base64Regex =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  return base64Regex.test(value);
}

/**
 * 验证字符串是否是有效的十六进制数
 *
 * @example
 * ```typescript
 * isHexadecimal('123abc'); // true
 * isHexadecimal('123abcg'); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @returns 如果是有效的十六进制数则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isHexadecimal(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9A-Fa-f]+$/.test(value);
}

/**
 * 验证字符串是否是有效的UUID
 *
 * @example
 * ```typescript
 * isUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * isUUID('550e8400-e29b-11d4-a716-446655440000', 4); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @param version - UUID版本 (3, 4, 5 或 'all')
 * @returns 如果是有效的UUID则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isUUID(value: string, version?: 3 | 4 | 5 | 'all'): boolean {
  if (!value || typeof value !== 'string') return false;

  const patterns = {
    3: /^[0-9A-F]{8}-[0-9A-F]{4}-3[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
    4: /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    5: /^[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
    all: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
  };

  const pattern = version ? patterns[version] : patterns.all;
  return pattern.test(value);
}

/**
 * 验证字符串是否是有效的JSON
 *
 * @example
 * ```typescript
 * isJSON('{"key": "value"}'); // true
 * isJSON('Invalid JSON'); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @returns 如果是有效的JSON则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isJSON(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 验证字符串是否是有效的手机号码
 *
 * @example
 * ```typescript
 * isPhoneNumber('13800138000', 'zh-CN'); // true (中国手机号)
 * isPhoneNumber('123-456-7890', 'en-US'); // true (美国手机号)
 * ```
 *
 * @param value - 要验证的字符串
 * @param locale - 语言区域（影响号码格式）
 * @returns 如果是有效的手机号码则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isPhoneNumber(value: string, locale?: string): boolean {
  if (!value || typeof value !== 'string') return false;

  // 中国手机号
  if (locale === 'zh-CN') {
    return /^1[3-9]\d{9}$/.test(value);
  }

  // 美国手机号
  if (locale === 'en-US') {
    return /^(\+?1)?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/.test(
      value
    );
  }

  // 通用格式，仅允许数字和常见分隔符
  return /^[\d\s\-+().]+$/.test(value);
}

/**
 * 验证字符串是否是强密码
 *
 * @example
 * ```typescript
 * isStrongPassword('Abc123!@#'); // true
 * isStrongPassword('weakpass'); // false
 * isStrongPassword('Abc123', { minSymbols: 0 }); // true
 * ```
 *
 * @param value - 要验证的字符串
 * @param options - 密码强度选项
 * @returns 如果是强密码则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isStrongPassword(
  value: string,
  options: PasswordOptions = {}
): boolean {
  if (!value || typeof value !== 'string') return false;

  // 默认选项
  const opts = {
    minLength: options.minLength || 8,
    minLowercase: options.minLowercase || 1,
    minUppercase: options.minUppercase || 1,
    minNumbers: options.minNumbers || 1,
    minSymbols: options.minSymbols || 1
  };

  // 检查长度
  if (value.length < opts.minLength) return false;

  // 检查小写字母
  if (
    opts.minLowercase > 0 &&
    (value.match(/[a-z]/g) || []).length < opts.minLowercase
  ) {
    return false;
  }

  // 检查大写字母
  if (
    opts.minUppercase > 0 &&
    (value.match(/[A-Z]/g) || []).length < opts.minUppercase
  ) {
    return false;
  }

  // 检查数字
  if (
    opts.minNumbers > 0 &&
    (value.match(/[0-9]/g) || []).length < opts.minNumbers
  ) {
    return false;
  }

  // 检查特殊字符
  if (
    opts.minSymbols > 0 &&
    (value.match(/[^a-zA-Z0-9]/g) || []).length < opts.minSymbols
  ) {
    return false;
  }

  return true;
}

/**
 * 验证字符串是否与正则表达式匹配
 *
 * @example
 * ```typescript
 * matches('abc123', /^[a-z0-9]+$/); // true
 * matches('ABC', /^[a-z0-9]+$/); // false
 * ```
 *
 * @param value - 要验证的字符串
 * @param pattern - 正则表达式或正则表达式字符串
 * @returns 如果匹配则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function matches(value: string, pattern: RegExp | string): boolean {
  if (!value || typeof value !== 'string') return false;

  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return regex.test(value);
}

/**
 * 验证值是否为整数
 *
 * @example
 * ```typescript
 * isInteger(123); // true
 * isInteger(123.45); // false
 * isInteger('123'); // false (类型不匹配)
 * ```
 *
 * @param value - 要验证的值
 * @returns 如果是整数则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 数值验证
 */
export function isInteger(value: any): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * 验证值是否为浮点数
 *
 * @example
 * ```typescript
 * isFloat(123.45); // true
 * isFloat(123); // false
 * isFloat('123.45'); // false (类型不匹配)
 * ```
 *
 * @param value - 要验证的值
 * @returns 如果是浮点数则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 数值验证
 */
export function isFloat(value: any): boolean {
  return (
    typeof value === 'number' &&
    !Number.isInteger(value) &&
    Number.isFinite(value)
  );
}

/**
 * 验证数值是否为正数
 *
 * @example
 * ```typescript
 * isPositive(123); // true
 * isPositive(-123); // false
 * isPositive(0); // false
 * ```
 *
 * @param value - 要验证的数值
 * @returns 如果是正数则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 数值验证
 */
export function isPositive(value: number): boolean {
  return typeof value === 'number' && value > 0;
}

/**
 * 验证数值是否为负数
 *
 * @example
 * ```typescript
 * isNegative(-123); // true
 * isNegative(123); // false
 * isNegative(0); // false
 * ```
 *
 * @param value - 要验证的数值
 * @returns 如果是负数则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 数值验证
 */
export function isNegative(value: number): boolean {
  return typeof value === 'number' && value < 0;
}

/**
 * 验证数值是否在指定范围内
 *
 * 注意：此函数与number/range.ts中的inRange行为不同：
 * - isInRange是闭区间[min, max]，同时包含最小值和最大值
 * - inRange是半开区间[start, end)，包含起始值但不包含结束值
 * - isInRange需要明确指定min和max两个参数
 * - isInRange不会自动调整参数顺序，min必须小于等于max
 *
 * @example
 * ```typescript
 * isInRange(5, 1, 10); // true
 * isInRange(1, 1, 10); // true (包含边界值)
 * isInRange(10, 1, 10); // true (包含边界值)
 * isInRange(0, 1, 10); // false
 * isInRange(11, 1, 10); // false
 * ```
 *
 * @param value - 要验证的数值
 * @param min - 范围最小值
 * @param max - 范围最大值
 * @returns 如果在范围内则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 数值验证
 * @see inRange 在number/range模块中，用于检查半开区间[start, end)
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * 验证数值是否可被另一个数整除
 *
 * @example
 * ```typescript
 * isDivisibleBy(10, 2); // true
 * isDivisibleBy(10, 3); // false
 * ```
 *
 * @param value - 要验证的数值
 * @param divisor - 除数
 * @returns 如果可被整除则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 数值验证
 */
export function isDivisibleBy(value: number, divisor: number): boolean {
  if (typeof value !== 'number' || typeof divisor !== 'number') {
    return false;
  }

  if (divisor === 0) {
    return false;
  }

  return value % divisor === 0;
}

/**
 * 验证日期是否晚于比较日期
 *
 * @example
 * ```typescript
 * isAfterDate(new Date('2023-01-02'), new Date('2023-01-01')); // true
 * isAfterDate(new Date('2023-01-01'), new Date('2023-01-02')); // false
 * ```
 *
 * @param value - 要验证的日期
 * @param comparisonDate - 比较日期
 * @returns 如果日期晚于比较日期则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期验证
 */
export function isAfterDate(value: Date, comparisonDate: Date): boolean {
  if (!(value instanceof Date) || !(comparisonDate instanceof Date)) {
    return false;
  }

  return value.getTime() > comparisonDate.getTime();
}

/**
 * 验证日期是否早于比较日期
 *
 * @example
 * ```typescript
 * isBeforeDate(new Date('2023-01-01'), new Date('2023-01-02')); // true
 * isBeforeDate(new Date('2023-01-02'), new Date('2023-01-01')); // false
 * ```
 *
 * @param value - 要验证的日期
 * @param comparisonDate - 比较日期
 * @returns 如果日期早于比较日期则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 日期验证
 */
export function isBeforeDate(value: Date, comparisonDate: Date): boolean {
  if (!(value instanceof Date) || !(comparisonDate instanceof Date)) {
    return false;
  }

  return value.getTime() < comparisonDate.getTime();
}

/**
 * 验证值的长度是否在指定范围内
 *
 * @example
 * ```typescript
 * isLength('hello', 3, 10); // true
 * isLength([1, 2, 3], 2, 5); // true
 * isLength('hi', 3); // false
 * ```
 *
 * @param value - 要验证的值（数组或字符串）
 * @param min - 最小长度
 * @param max - 最大长度（可选）
 * @returns 如果长度在范围内则返回true，否则返回false
 * @remarks
 * 版本: 1.0.0
 * 分类: 字符串验证
 */
export function isLength(
  value: any[] | string,
  min: number,
  max?: number
): boolean {
  if (!Array.isArray(value) && typeof value !== 'string') {
    return false;
  }

  const length = value.length;

  if (min < 0) {
    return false;
  }

  if (max !== undefined) {
    return length >= min && length <= max;
  }

  return length >= min;
}

/**
 * 验证结果接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 验证结果
 *
 * @public
 */
export interface ValidationResult {
  /**
   * 表示验证是否通过
   */
  valid: boolean;

  /**
   * 验证失败时的错误消息列表
   */
  errors: string[];
}

/**
 * 验证函数类型定义
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型定义
 *
 * @public
 */
export type ValidatorFn = (value: any, ...args: any[]) => boolean;

/**
 * 验证规则接口
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 验证规则
 *
 * @public
 */
export interface ValidationRule {
  /**
   * 验证函数
   */
  validator: ValidatorFn;

  /**
   * 传递给验证函数的参数数组
   */
  args?: any[];

  /**
   * 验证失败时的错误消息
   */
  message: string;
}

/**
 * 验证值是否符合指定的所有规则
 *
 * @example
 * ```typescript
 * const emailRule = {
 *   validator: isEmail,
 *   message: '请输入有效的电子邮件地址'
 * };
 * const result = validate('test@example.com', [emailRule]);
 * console.log(result.valid); // true
 * ```
 *
 * @param value - 要验证的值
 * @param rules - 验证规则列表
 * @returns 验证结果
 * @remarks
 * 版本: 1.0.0
 * 分类: 验证
 */
export function validate(
  value: any,
  rules: ValidationRule[]
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: []
  };

  for (const rule of rules) {
    const valid = rule.args
      ? rule.validator(value, ...rule.args)
      : rule.validator(value);

    if (!valid) {
      result.valid = false;
      result.errors.push(rule.message);
    }
  }

  return result;
}

/**
 * 为对象中的多个字段应用验证规则并返回所有验证结果
 *
 * @example
 * ```typescript
 * const rules = {
 *   email: [{ validator: isEmail, message: '无效的邮箱' }],
 *   password: [{ validator: isStrongPassword, message: '密码不够强' }]
 * };
 * const values = { email: 'test@example.com', password: 'weak' };
 * const results = validateAll(values, rules);
 * ```
 *
 * @param values - 要验证的字段值对象
 * @param rulesMap - 字段验证规则映射
 * @returns 字段验证结果映射
 * @remarks
 * 版本: 1.0.0
 * 分类: 验证
 */
export function validateAll(
  values: Record<string, any>,
  rulesMap: Record<string, ValidationRule[]>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const field in rulesMap) {
    if (Object.prototype.hasOwnProperty.call(rulesMap, field)) {
      results[field] = validate(values[field], rulesMap[field]);
    }
  }

  return results;
}

/**
 * 验证整个对象，如果有任何字段不符合规则则返回无效结果
 *
 * @example
 * ```typescript
 * const rules = {
 *   email: [{ validator: isEmail, message: '无效的邮箱' }],
 *   password: [{ validator: isStrongPassword, message: '密码不够强' }]
 * };
 * const user = { email: 'test@example.com', password: 'weak' };
 * const result = validateObject(user, rules);
 * ```
 *
 * @param obj - 要验证的对象
 * @param rulesMap - 字段验证规则映射
 * @returns 验证结果
 * @remarks
 * 版本: 1.0.0
 * 分类: 验证
 */
export function validateObject(
  obj: Record<string, any>,
  rulesMap: Record<string, ValidationRule[]>
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: []
  };

  const fieldResults = validateAll(obj, rulesMap);

  for (const field in fieldResults) {
    if (Object.prototype.hasOwnProperty.call(fieldResults, field)) {
      const fieldResult = fieldResults[field];

      if (!fieldResult.valid) {
        result.valid = false;
        result.errors.push(
          ...fieldResult.errors.map((error) => `${field}: ${Error}`)
        );
      }
    }
  }

  return result;
}

/**
 * 创建一个验证规则工厂函数
 *
 * @example
 * ```typescript
 * const emailValidator = createValidator(isEmail, '无效的邮箱地址');
 * const rule = emailValidator('请输入有效的电子邮件地址');
 * const result = validate('test@example.com', [rule]);
 * ```
 *
 * @param validatorFn - 验证函数
 * @param defaultMessage - 默认错误消息
 * @returns 返回创建验证规则的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 验证
 */
export function createValidator(
  validatorFn: ValidatorFn,
  defaultMessage: string
): (message?: string) => ValidationRule {
  return (message?: string): ValidationRule => ({
    validator: validatorFn,
    message: message || defaultMessage
  });
}
