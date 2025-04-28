/**
 * 类型检查相关函数
 */

/**
 * 检查值是否为 null
 * @param value 要检查的值
 * @returns 如果值为 null 则返回 true，否则返回 false
 */
export function isNull(value: any): value is null {
  return value === null;
}

/**
 * 检查值是否为 undefined
 * @param value 要检查的值
 * @returns 如果值为 undefined 则返回 true，否则返回 false
 */
export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

/**
 * 检查值是否为 null 或 undefined
 * @param value 要检查的值
 * @returns 如果值为 null 或 undefined 则返回 true，否则返回 false
 */
export function isNil(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查值是否为字符串类型
 * @param value 要检查的值
 * @returns 如果值为字符串类型则返回 true，否则返回 false
 */
export function isString(value: any): value is string {
  return typeof value === 'string' || value instanceof String;
}

/**
 * 检查值是否为数字类型
 * @param value 要检查的值
 * @returns 如果值为数字类型则返回 true，否则返回 false
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' || value instanceof Number;
}

/**
 * 检查值是否为布尔类型
 * @param value 要检查的值
 * @returns 如果值为布尔类型则返回 true，否则返回 false
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean' || value instanceof Boolean;
}

/**
 * 检查值是否为数组
 * @param value 要检查的值
 * @returns 如果值为数组则返回 true，否则返回 false
 */
export function isArray(value: any): value is Array<any> {
  return Array.isArray(value);
}

/**
 * 检查值是否为对象
 * @param value 要检查的值
 * @returns 如果值为对象则返回 true，否则返回 false（注意：数组也是对象）
 */
export function isObject(value: any): value is object {
  return value !== null && typeof value === 'object';
}

/**
 * 检查值是否为纯对象（由 {} 或 new Object() 创建的对象）
 * @param value 要检查的值
 * @returns 如果值为纯对象则返回 true，否则返回 false
 */
export function isPlainObject(value: any): value is Record<string, any> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * 检查值是否为函数
 * @param value 要检查的值
 * @returns 如果值为函数则返回 true，否则返回 false
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * 检查值是否为日期对象
 * @param value 要检查的值
 * @returns 如果值为日期对象则返回 true，否则返回 false
 */
export function isDate(value: any): value is Date {
  return value instanceof Date;
}

/**
 * 检查值是否为正则表达式对象
 * @param value 要检查的值
 * @returns 如果值为正则表达式对象则返回 true，否则返回 false
 */
export function isRegExp(value: any): value is RegExp {
  return value instanceof RegExp;
}

/**
 * 检查值是否为 Error 对象
 * @param value 要检查的值
 * @returns 如果值为 Error 对象则返回 true，否则返回 false
 */
export function isError(value: any): value is Error {
  return value instanceof Error;
}

/**
 * 检查值是否为 Symbol 类型
 * @param value 要检查的值
 * @returns 如果值为 Symbol 类型则返回 true，否则返回 false
 */
export function isSymbol(value: any): value is symbol {
  return typeof value === 'symbol';
}

/**
 * 检查值是否为 Map 对象
 * @param value 要检查的值
 * @returns 如果值为 Map 对象则返回 true，否则返回 false
 */
export function isMap(value: any): value is Map<any, any> {
  return value instanceof Map;
}

/**
 * 检查值是否为 Set 对象
 * @param value 要检查的值
 * @returns 如果值为 Set 对象则返回 true，否则返回 false
 */
export function isSet(value: any): value is Set<any> {
  return value instanceof Set;
}

/**
 * 检查值是否为 Promise 对象
 * @param value 要检查的值
 * @returns 如果值为 Promise 对象则返回 true，否则返回 false
 */
export function isPromise(value: any): value is Promise<any> {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof value.then === 'function' &&
    typeof value.catch === 'function'
  );
}

/**
 * 检查值是否为可迭代对象
 * @param value 要检查的值
 * @returns 如果值实现了迭代器协议则返回 true，否则返回 false
 */
export function isIterable(value: any): value is Iterable<any> {
  return !!value && typeof value[Symbol.iterator] === 'function';
}

/**
 * 获取值的具体类型
 * @param value 要检查的值
 * @returns 表示值类型的小写字符串，如 'string', 'number', 'object', 'array' 等
 */
export function getType(value: any): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (isArray(value)) {
    return 'array';
  }

  if (isDate(value)) {
    return 'date';
  }

  if (isRegExp(value)) {
    return 'regexp';
  }

  if (isError(value)) {
    return 'error';
  }

  if (isMap(value)) {
    return 'map';
  }

  if (isSet(value)) {
    return 'set';
  }

  return typeof value;
}

/**
 * 获取值的原始类型
 * @param value 要检查的值
 * @returns 表示值原始类型的字符串，如 'string', 'number', 'boolean', 'undefined', 'object', 'function', 'symbol' 等
 */
export function getPrimitiveType(value: any): string {
  return typeof value;
}

/**
 * 检查值是否为指定的类型
 * @param value 要检查的值
 * @param type 要检查的类型字符串，如 'string', 'number', 'array' 等
 * @returns 如果值为指定类型则返回 true，否则返回 false
 */
export function isTypeOf(value: any, type: string): boolean {
  return getType(value) === type.toLowerCase();
}

/**
 * 检查值是否为指定构造函数的实例
 * @param value 要检查的值
 * @param constructor 构造函数
 * @returns 如果值是指定构造函数的实例则返回 true，否则返回 false
 */
export function isInstanceOf(value: any, constructor: Function): boolean {
  return value instanceof constructor;
}

/**
 * 创建一个类型保护函数
 * @param type 类型字符串
 * @returns 返回一个类型保护函数，可用于TypeScript的类型保护
 */
export function typeGuard<T>(type: string): (value: any) => value is T {
  return function (value: any): value is T {
    return isTypeOf(value, type);
  };
}
