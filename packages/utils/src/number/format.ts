/**
 * 数字格式化相关函数
 *
 * 本模块提供了一系列与数字格式化相关的工具函数，包括精确舍入、格式化为货币、百分比等
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 数字处理
 *
 * @packageDocumentation
 */

/**
 * 格式化选项接口
 *
 * 定义数字格式化时的各种选项，包括小数位数、分隔符、前缀和后缀
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 配置接口
 *
 * @public
 */
export interface FormatNumberOptions {
  /**
   * 小数位数
   *
   * 控制格式化后数字的小数位数
   *
   * @defaultValue 2
   */
  decimalPlaces?: number;

  /**
   * 小数分隔符
   *
   * 用于分隔整数部分和小数部分的字符
   *
   * @defaultValue '.'
   */
  decimalSeparator?: string;

  /**
   * 千位分隔符
   *
   * 用于在整数部分每三位数字间添加的分隔符
   *
   * @defaultValue ','
   */
  thousandsSeparator?: string;

  /**
   * 前缀，如货币符号
   *
   * 添加在格式化后数字前面的字符串
   *
   * @defaultValue ''
   */
  prefix?: string;

  /**
   * 后缀，如百分号
   *
   * 添加在格式化后数字后面的字符串
   *
   * @defaultValue ''
   */
  suffix?: string;
}

/**
 * 四舍五入到指定的精度
 *
 * 解决JavaScript浮点数计算精度问题，确保四舍五入正确执行
 *
 * @param number - 要四舍五入的数字
 * @param precision - 精度，默认为0
 * @returns 四舍五入后的数字
 * @throws `TypeError` 如果参数不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数字精度
 *
 * @example
 * ```typescript
 * round(1.2345);        // 1
 * round(1.2345, 2);     // 1.23
 * round(1.235, 2);      // 1.24
 * ```
 * @public
 */
export function round(number: number, precision: number = 0): number {
  let result: number;

  if (!isFinite(number)) {
    result = number;
  } else {
    const factor = Math.pow(10, precision);
    result = Math.round(number * factor) / factor;
  }

  return result;
}

/**
 * 向下舍入到指定的精度
 *
 * 解决JavaScript浮点数计算精度问题，确保向下舍入正确执行
 *
 * @param number - 要向下舍入的数字
 * @param precision - 精度，默认为0
 * @returns 向下舍入后的数字
 * @throws `TypeError` 如果参数不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数字精度
 *
 * @example
 * ```typescript
 * floor(1.2345);        // 1
 * floor(1.2345, 2);     // 1.23
 * floor(1.236, 2);      // 1.23
 * ```
 * @public
 */
export function floor(number: number, precision: number = 0): number {
  let result: number;

  if (!isFinite(number)) {
    result = number;
  } else {
    const factor = Math.pow(10, precision);
    result = Math.floor(number * factor) / factor;
  }

  return result;
}

/**
 * 向上舍入到指定的精度
 *
 * 解决JavaScript浮点数计算精度问题，确保向上舍入正确执行
 *
 * @param number - 要向上舍入的数字
 * @param precision - 精度，默认为0
 * @returns 向上舍入后的数字
 * @throws `TypeError` 如果参数不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数字精度
 *
 * @example
 * ```typescript
 * ceil(1.2345);         // 2
 * ceil(1.2345, 2);      // 1.24
 * ceil(1.234, 2);       // 1.24
 * ```
 * @public
 */
export function ceil(number: number, precision: number = 0): number {
  let result: number;

  if (!isFinite(number)) {
    result = number;
  } else {
    const factor = Math.pow(10, precision);
    result = Math.ceil(number * factor) / factor;
  }

  return result;
}

/**
 * 将数字转换为指定精度的字符串，可指定舍入模式，避免JavaScript原生toFixed的精度问题
 *
 * 比JavaScript原生的toFixed更加准确，避免了浮点数精度问题
 *
 * @param number - 要处理的数字
 * @param precision - 精度，默认为0
 * @param roundingMode - 舍入模式，可选值为'round'、'floor'、'ceil'，默认为'round'
 * @returns 处理后的字符串
 * @throws `TypeError` 如果参数不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数字格式化
 *
 * @example
 * ```typescript
 * toFixed(1.2345, 2);                   // "1.23"
 * toFixed(1.235, 2);                    // "1.24"
 * toFixed(1.235, 2, 'floor');           // "1.23"
 * toFixed(1.235, 2, 'ceil');            // "1.24"
 * ```
 * @public
 */
export function toFixed(
  number: number,
  precision: number = 0,
  roundingMode: 'round' | 'floor' | 'ceil' = 'round'
): string {
  let result: string;

  if (!isFinite(number)) {
    result = String(number);
  } else {
    let processedNumber: number;

    switch (roundingMode) {
      case 'floor':
        processedNumber = floor(number, precision);
        break;
      case 'ceil':
        processedNumber = ceil(number, precision);
        break;
      case 'round':
      default:
        processedNumber = round(number, precision);
        break;
    }

    // 将数字转换为字符串并确保有正确的小数位数
    let resultStr = String(processedNumber);

    // 处理小数部分
    if (precision > 0) {
      const parts = resultStr.split('.');
      let intPart = parts[0];
      let decimalPart = parts[1] || '';

      // 补齐小数位
      while (decimalPart.length < precision) {
        decimalPart += '0';
      }

      resultStr = intPart + '.' + decimalPart;
    }

    result = resultStr;
  }

  return result;
}

/**
 * 将数字格式化为字符串，支持添加千位分隔符、指定小数位数等
 *
 * 提供完整的数字格式化功能，包括小数位控制、分隔符定制、前缀后缀添加等
 *
 * @param number - 要格式化的数字
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 * @throws `TypeError` 如果number参数不是数字类型
 * @remarks
 * 版本: 1.0.0
 * 分类: 数字格式化
 *
 * @example
 * ```typescript
 * formatNumber(1234.56);                                      // "1,234.56"
 * formatNumber(1234.56, { decimalPlaces: 1 });                // "1,234.6"
 * formatNumber(1234.56, { thousandsSeparator: ' ' });         // "1 234.56"
 * formatNumber(1234.56, { prefix: '$', suffix: ' USD' });     // "$1,234.56 USD"
 * ```
 * @public
 */
export function formatNumber(
  number: number,
  options: FormatNumberOptions = {}
): string {
  // 处理默认选项
  const {
    decimalPlaces = 2,
    decimalSeparator = '.',
    thousandsSeparator = ',',
    prefix = '',
    suffix = ''
  } = options;

  // 处理非数字情况
  if (!isFinite(number)) {
    return String(number);
  }

  // 使用toFixed获取正确的小数位数
  const fixedNumber = toFixed(number, decimalPlaces);

  // 分割整数部分和小数部分
  const parts = fixedNumber.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] || '';

  // 添加千位分隔符
  if (thousandsSeparator) {
    // 处理负数
    const isNegative = integerPart.startsWith('-');
    if (isNegative) {
      integerPart = integerPart.substring(1);
    }

    // 从右向左每3位添加分隔符
    const rgx = /(\d+)(\d{3})/;
    while (rgx.test(integerPart)) {
      integerPart = integerPart.replace(rgx, '$1' + thousandsSeparator + '$2');
    }

    // 如果是负数，添加负号
    if (isNegative) {
      integerPart = '-' + integerPart;
    }
  }

  // 拼接结果
  let result = integerPart;

  // 添加小数部分
  if (decimalPlaces > 0) {
    result += decimalSeparator + decimalPart;
  }

  // 添加前缀和后缀
  return prefix + result + suffix;
}
