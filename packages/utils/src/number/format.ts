/**
 * 数字格式化相关函数
 */

/**
 * 格式化选项接口
 */
export interface FormatNumberOptions {
  decimalPlaces?: number;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * 四舍五入到指定的精度
 * @param number 要四舍五入的数字
 * @param precision 精度，默认为0
 * @returns 四舍五入后的数字
 */
export function round(number: number, precision: number = 0): number {
  if (!isFinite(number)) {
    return number;
  }

  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

/**
 * 向下舍入到指定的精度
 * @param number 要向下舍入的数字
 * @param precision 精度，默认为0
 * @returns 向下舍入后的数字
 */
export function floor(number: number, precision: number = 0): number {
  if (!isFinite(number)) {
    return number;
  }

  const factor = Math.pow(10, precision);
  return Math.floor(number * factor) / factor;
}

/**
 * 向上舍入到指定的精度
 * @param number 要向上舍入的数字
 * @param precision 精度，默认为0
 * @returns 向上舍入后的数字
 */
export function ceil(number: number, precision: number = 0): number {
  if (!isFinite(number)) {
    return number;
  }

  const factor = Math.pow(10, precision);
  return Math.ceil(number * factor) / factor;
}

/**
 * 将数字转换为指定精度的字符串，可指定舍入模式，避免JavaScript原生toFixed的精度问题
 * @param number 要处理的数字
 * @param precision 精度，默认为0
 * @param roundingMode 舍入模式，可选值为'round'、'floor'、'ceil'，默认为'round'
 * @returns 处理后的字符串
 */
export function toFixed(
  number: number,
  precision: number = 0,
  roundingMode: 'round' | 'floor' | 'ceil' = 'round'
): string {
  if (!isFinite(number)) {
    return String(number);
  }

  let result: number;

  switch (roundingMode) {
    case 'floor':
      result = floor(number, precision);
      break;
    case 'ceil':
      result = ceil(number, precision);
      break;
    case 'round':
    default:
      result = round(number, precision);
      break;
  }

  // 将数字转换为字符串并确保有正确的小数位数
  let resultStr = String(result);

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

  return resultStr;
}

/**
 * 将数字格式化为字符串，支持添加千位分隔符、指定小数位数等
 * @param number 要格式化的数字
 * @param options 格式化选项
 * @returns 格式化后的字符串
 */
export function formatNumber(
  number: number,
  options: FormatNumberOptions = {}
): string {
  if (!isFinite(number)) {
    return String(number);
  }

  const {
    decimalPlaces,
    decimalSeparator = '.',
    thousandsSeparator = ',',
    prefix = '',
    suffix = ''
  } = options;

  // 处理舍入和小数位数
  let numStr =
    decimalPlaces !== undefined
      ? toFixed(number, decimalPlaces)
      : String(number);

  // 处理负号和分离整数、小数部分
  const isNegative = numStr.startsWith('-');
  if (isNegative) {
    numStr = numStr.slice(1);
  }

  const parts = numStr.split('.');
  let intPart = parts[0];
  const decimalPart = parts[1] || '';

  // 添加千位分隔符
  if (thousandsSeparator) {
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  }

  // 组合各部分
  let result = intPart;
  if (decimalPart) {
    result += decimalSeparator + decimalPart;
  }

  // 添加前缀和后缀
  if (isNegative) {
    return '-' + prefix + result + suffix;
  }

  return prefix + result + suffix;
}
