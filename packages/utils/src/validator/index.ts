/**
 * 数据验证工具函数模块
 * 提供各类数据验证相关的工具函数
 */

// 导出JSON验证模块
import * as jsonValidator from './json.js';
export { jsonValidator as json };

// 字符串验证相关接口
export interface EmailOptions {
  allowDisplayName?: boolean;
  requireTLD?: boolean;
  allowIPDomain?: boolean;
}

export interface URLOptions {
  protocols?: string[];
  requireProtocol?: boolean;
  requireValidProtocol?: boolean;
  allowQuery?: boolean;
  allowFragment?: boolean;
}

export interface PasswordOptions {
  minLength?: number;
  minLowercase?: number;
  minUppercase?: number;
  minNumbers?: number;
  minSymbols?: number;
}

// 字符串验证函数

/**
 * 验证字符串是否为有效的电子邮件地址
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
 * 验证字符串是否为有效的IP地址
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

  // 其他语言按英文处理
  return /^[A-Za-z]+$/.test(value);
}

/**
 * 验证字符串是否只包含字母和数字
 */
export function isAlphanumeric(value: string, locale?: string): boolean {
  if (!value || typeof value !== 'string') return false;

  // 简单的英文字母数字检查
  if (!locale || locale.startsWith('en')) {
    return /^[0-9A-Za-z]+$/.test(value);
  }

  // 中文加数字检查
  if (locale === 'zh-CN') {
    return /^[\u4e00-\u9fa50-9]+$/.test(value);
  }

  // 其他语言按英文处理
  return /^[0-9A-Za-z]+$/.test(value);
}

/**
 * 验证字符串是否只包含数字
 */
export function isNumeric(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9]+$/.test(value);
}

/**
 * 验证字符串是否为有效的Base64编码
 */
export function isBase64(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  // Base64编码的正则表达式
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
    value
  );
}

/**
 * 验证字符串是否为十六进制格式
 */
export function isHexadecimal(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9A-Fa-f]+$/.test(value);
}

/**
 * 验证字符串是否为有效的UUID
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
 * 验证字符串是否为有效的JSON格式
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
 * 验证字符串是否为有效的电话号码
 */
export function isPhoneNumber(value: string, locale?: string): boolean {
  if (!value || typeof value !== 'string') return false;

  // 不同国家/地区的电话号码格式
  const patterns: Record<string, RegExp> = {
    US: /^(\+?1)?[- ]?\(?[2-9][0-9]{2}\)?[- ]?[2-9][0-9]{2}[- ]?[0-9]{4}$/,
    CN: /^(\+?86)?[- ]?1[3-9][0-9]{9}$/,
    GB: /^(\+?44|0)7\d{9}$/
    // 其他国家可以继续添加
  };

  if (locale && patterns[locale]) {
    return patterns[locale].test(value);
  }

  // 如果没有指定国家或不支持的国家，使用一个宽松的验证
  return /^\+?[0-9]{8,15}$/.test(value.replace(/[- ]/g, ''));
}

/**
 * 验证字符串是否为有效的邮政编码
 */
export function isPostalCode(value: string, locale: string): boolean {
  if (!value || typeof value !== 'string' || !locale) return false;

  // 不同国家/地区的邮政编码格式
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    CN: /^\d{6}$/,
    GB: /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i
    // 其他国家可以继续添加
  };

  if (patterns[locale]) {
    return patterns[locale].test(value);
  }

  return false;
}

/**
 * 验证密码是否满足强度要求
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

  // 检查密码长度
  if (value.length < opts.minLength) return false;

  // 检查小写字母
  const lowercaseCount = (value.match(/[a-z]/g) || []).length;
  if (lowercaseCount < opts.minLowercase) return false;

  // 检查大写字母
  const uppercaseCount = (value.match(/[A-Z]/g) || []).length;
  if (uppercaseCount < opts.minUppercase) return false;

  // 检查数字
  const numbersCount = (value.match(/[0-9]/g) || []).length;
  if (numbersCount < opts.minNumbers) return false;

  // 检查特殊符号
  const symbolsCount = (value.match(/[^a-zA-Z0-9]/g) || []).length;
  if (symbolsCount < opts.minSymbols) return false;

  return true;
}

/**
 * 验证字符串是否匹配指定的正则表达式模式
 */
export function matches(value: string, pattern: RegExp | string): boolean {
  if (!value || typeof value !== 'string') return false;

  let regex: RegExp;
  if (typeof pattern === 'string') {
    regex = new RegExp(pattern);
  } else {
    regex = pattern;
  }

  return regex.test(value);
}

// 数字验证函数

/**
 * 验证值是否为整数
 */
export function isInteger(value: any): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * 验证值是否为浮点数
 */
export function isFloat(value: any): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 验证数字是否为正数
 */
export function isPositive(value: number): boolean {
  return typeof value === 'number' && value > 0;
}

/**
 * 验证数字是否为负数
 */
export function isNegative(value: number): boolean {
  return typeof value === 'number' && value < 0;
}

/**
 * 验证数字是否在指定范围内
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * 验证数字是否能被另一个数整除
 */
export function isDivisibleBy(value: number, divisor: number): boolean {
  return (
    typeof value === 'number' &&
    typeof divisor === 'number' &&
    divisor !== 0 &&
    value % divisor === 0
  );
}

// 日期验证函数

/**
 * 验证值是否为有效的日期
 */
export function isDate(value: any): boolean {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 验证日期是否晚于指定日期
 */
export function isAfterDate(value: Date, comparisonDate: Date): boolean {
  return (
    isDate(value) &&
    isDate(comparisonDate) &&
    value.getTime() > comparisonDate.getTime()
  );
}

/**
 * 验证日期是否早于指定日期
 */
export function isBeforeDate(value: Date, comparisonDate: Date): boolean {
  return (
    isDate(value) &&
    isDate(comparisonDate) &&
    value.getTime() < comparisonDate.getTime()
  );
}

// 对象和数组验证函数

/**
 * 验证数组或字符串的长度是否在指定范围内
 */
export function isLength(
  value: any[] | string,
  min: number,
  max?: number
): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string' || Array.isArray(value)) {
    const length = value.length;
    return max !== undefined ? length >= min && length <= max : length === min;
  }

  return false;
}

/**
 * 验证值是否为空
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * 验证值是否非空
 */
export function isNotEmpty(value: any): boolean {
  return !isEmpty(value);
}

/**
 * 验证数组或字符串是否包含指定元素或子字符串
 */
export function contains(value: any[] | string, seed: any): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    return value.includes(String(seed));
  }

  if (Array.isArray(value)) {
    return value.includes(seed);
  }

  return false;
}

/**
 * 验证两个值是否相等
 */
export function equals(value: any, comparison: any): boolean {
  if (value === comparison) return true;

  // 处理日期比较
  if (value instanceof Date && comparison instanceof Date) {
    return value.getTime() === comparison.getTime();
  }

  // 处理数组比较
  if (Array.isArray(value) && Array.isArray(comparison)) {
    if (value.length !== comparison.length) return false;
    for (let i = 0; i < value.length; i++) {
      if (!equals(value[i], comparison[i])) return false;
    }
    return true;
  }

  // 处理对象比较
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof comparison === 'object' &&
    comparison !== null
  ) {
    const valueKeys = Object.keys(value);
    const comparisonKeys = Object.keys(comparison);

    if (valueKeys.length !== comparisonKeys.length) return false;

    for (const key of valueKeys) {
      if (
        !comparison.hasOwnProperty(key) ||
        !equals(value[key], comparison[key])
      ) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * 验证值是否在指定数组中
 */
export function isIn(value: any, values: any[]): boolean {
  if (!Array.isArray(values)) return false;
  return values.some((item) => equals(value, item));
}

/**
 * 验证值是否不为空
 */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
}

// 验证结果接口
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 验证函数类型
export type ValidatorFn = (value: any, ...args: any[]) => boolean;

// 验证规则接口
export interface ValidationRule {
  validator: ValidatorFn;
  args?: any[];
  message: string;
}

// 综合验证函数

/**
 * 使用指定规则验证单个值
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
    const args = rule.args || [];
    const isValid = rule.validator(value, ...args);

    if (!isValid) {
      result.valid = false;
      result.errors.push(rule.message);
    }
  }

  return result;
}

/**
 * 验证多个值
 */
export function validateAll(
  values: Record<string, any>,
  rulesMap: Record<string, ValidationRule[]>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const [field, rules] of Object.entries(rulesMap)) {
    results[field] = validate(values[field], rules);
  }

  return results;
}

/**
 * 验证对象的所有字段
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

  for (const [field, fieldResult] of Object.entries(fieldResults)) {
    if (!fieldResult.valid) {
      result.valid = false;
      result.errors.push(
        ...fieldResult.errors.map((error) => `${field}: ${error}`)
      );
    }
  }

  return result;
}

/**
 * 创建自定义验证器
 */
export function createValidator(
  validatorFn: ValidatorFn,
  defaultMessage: string
): (message?: string) => ValidationRule {
  return (message?: string) => ({
    validator: validatorFn,
    message: message || defaultMessage
  });
}

/**
 * 链式验证构建器
 */
export function chain(value: any) {
  const rules: ValidationRule[] = [];

  const builder = {
    // 字符串验证方法
    isEmail: (message = '必须是有效的电子邮件地址', options?: EmailOptions) => {
      rules.push({
        validator: isEmail,
        args: [options],
        message
      });
      return builder;
    },

    isURL: (message = '必须是有效的URL', options?: URLOptions) => {
      rules.push({
        validator: isURL,
        args: [options],
        message
      });
      return builder;
    },

    // 可以添加更多验证方法...

    // 执行验证
    validate: (): ValidationResult => {
      return validate(value, rules);
    }
  };

  return builder;
}
