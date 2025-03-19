/**
 * 类型工具函数
 */

/**
 * 检查值是否为字符串
 * @param value 要检查的值
 * @returns 是否为字符串
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为数字
 * @param value 要检查的值
 * @returns 是否为数字
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 检查值是否为布尔值
 * @param value 要检查的值
 * @returns 是否为布尔值
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 检查值是否为函数
 * @param value 要检查的值
 * @returns 是否为函数
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * 检查值是否为数组
 * @param value 要检查的值
 * @returns 是否为数组
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * 检查值是否为日期
 * @param value 要检查的值
 * @returns 是否为日期
 */
export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 检查值是否为正则表达式
 * @param value 要检查的值
 * @returns 是否为正则表达式
 */
export function isRegExp(value: any): value is RegExp {
  return value instanceof RegExp;
}

/**
 * 检查值是否为Promise
 * @param value 要检查的值
 * @returns 是否为Promise
 */
export function isPromise(value: any): value is Promise<any> {
  return value && typeof value.then === 'function';
}

/**
 * 检查值是否为类
 * @param value 要检查的值
 * @returns 是否为类
 */
export function isClass(value: any): boolean {
  return isFunction(value) && /^\s*class\s+/.test(value.toString());
}

/**
 * 检查值是否为原始类型
 * @param value 要检查的值
 * @returns 是否为原始类型
 */
export function isPrimitive(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    isString(value) ||
    isNumber(value) ||
    isBoolean(value) ||
    isSymbol(value)
  );
}

/**
 * 检查值是否为Symbol
 * @param value 要检查的值
 * @returns 是否为Symbol
 */
export function isSymbol(value: any): value is symbol {
  return typeof value === 'symbol';
}

/**
 * 获取值的类型
 * @param value 要检查的值
 * @returns 类型字符串
 */
export function getType(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (isString(value)) return 'string';
  if (isNumber(value)) return 'number';
  if (isBoolean(value)) return 'boolean';
  if (isSymbol(value)) return 'symbol';
  if (isFunction(value)) return isClass(value) ? 'class' : 'function';
  if (isArray(value)) return 'array';
  if (isDate(value)) return 'date';
  if (isRegExp(value)) return 'regexp';
  if (isPromise(value)) return 'promise';
  return 'object';
}

/**
 * 将值转换为指定类型
 * @param value 要转换的值
 * @param type 目标类型
 * @returns 转换后的值
 */
export function convertTo(value: any, type: string): any {
  switch (type) {
    case 'string':
      return String(value);
    case 'number':
      return Number(value);
    case 'boolean':
      return Boolean(value);
    case 'date':
      return new Date(value);
    case 'array':
      return Array.isArray(value) ? value : [value];
    case 'object':
      return typeof value === 'object' ? value : { value };
    default:
      return value;
  }
}
